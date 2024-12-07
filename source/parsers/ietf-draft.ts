// /source/parser/ietf-draft.ts
// The parser for headers following the IETF draft specification (v6+).

import { parseList, parseDictionary as parseDict } from 'structured-headers'
import type { RateLimitInfo, HeadersObject, ParserOptions } from '../types'
import { getHeader } from '../headers.js'
import { parse as parseResetTime } from './reset.js'

/**
 * Parses standard headers as per the IETF draft specification.
 *
 * @param headers {HeadersObject} - The object containing headers to parse.
 * @param options {Partial<ParserOptions>} - The parser's configuration.
 * @param prefix {string} - The vendor-specific prefix that each header contains.
 *
 * @returns {RateLimitInfo | undefined} - The normalized rate limit information, if any header is found.
 */
export const parse = (
	headers: HeadersObject,
	options: Partial<ParserOptions>,
): RateLimitInfo[] => {
	const header = getHeader(headers, 'ratelimit')
	const policyHeader = getHeader(headers, 'ratelimit-policy')

	// The rate limit information is provided in a manner similar to non-standard
	// headers according to the 6th draft, so we do not need to handle it here
	// separately.

	// The value of the `RateLimit` header in the 7th draft is a dictionary, while
	// in the 8th draft, it is a list.
	let draft7, draft8
	try {
		draft7 = parseDict(header)
	} catch {
		try {
			draft8 = parseList(header)
		} catch (error) {
			if (options?.strict)
				throw Error(
					`Failed to parse 'RateLimit' header as per IETF standard drafts: ${error.message}`,
				)
		}
	}

	const rateLimits = []
	const policies =
		policyHeader !== undefined
			? parseList(policyHeader).map((policy) => {
					return {
						value: policy[0],
						params: policy[1],
					}
			  })
			: []

	if (draft7 !== undefined) {
		const limit = draft7.get('limit')[0]
		const info = {
			used: limit - draft7.get('remaining')[0],
			remaining: draft7.get('remaining')[0],
			reset: draft7.get('reset')[0],
		}

		for (const policy of policies)
			rateLimits.push({
				info: limit === policy.value ? info : undefined,
				policy: {
					quota: { value: policy.value, unit: 'requests' },
					window: policy.params.get('w'),
				},
			})
	}

	if (draft8 !== undefined) {
		for (const header of draft8) {
			const name = header[0]
			const info = {
				remaining: header[1].get('r'),
				reset: parseResetTime(header[1].get('t'), options),
			}

			for (const policy of policies) {
				const params = policy.params
				info.used = policy.params.get('q') - info.remaining

				rateLimits.push({
					info: name === policy.value ? info : undefined,
					policy: {
						name,
						quota: {
							value: params.get('q'),
							unit: params.get('qu') ?? 'requests',
						},
						window: params.get('w'),
						partition: header[1].get('pk')?.value ?? params.get('pk')?.value,
					},
				})
			}
		}
	}

	return rateLimits
}
