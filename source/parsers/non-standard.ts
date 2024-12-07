// /source/parser/non-standard.ts
// The parser for headers not following the IETF draft.

// @ts-expect-error no type definitions
import { parseItem } from 'structured-headers'
import { parse as parseResetTime } from './reset.js'
import type { HeadersObject, RateLimitInfo, ParserOptions } from '../types'
import { getHeader } from '../headers.js'
import { toInt } from '../utilities.js'

/**
 * Parses non standard headers as per their documentation.
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
	prefix: string,
): RateLimitInfo | undefined => {
	// Note that `||` is valid in the following lines because used should always
	// be at least 1, and `||` handles NaN correctly, whereas `??` doesn't.
	/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

	const limit = toInt(
		getHeader(headers, `${prefix}limit`) ||
			getHeader(headers, `${prefix}dailylimit`) || // Yelp does this [1].
			getHeader(headers, `${prefix}max`), // Amazon does this [1].
	)

	const used = toInt(
		getHeader(headers, `${prefix}used`) ||
			getHeader(headers, `${prefix}observed`), // GitLab does this [2].
	)

	const remaining = toInt(getHeader(headers, `${prefix}remaining`))

	// Try parsing the reset header passed in the response.
	let reset = parseResetTime(
		getHeader(headers, `${prefix}reset`) ||
			getHeader(headers, `${prefix}resettime`) || // Yelp does this [1].
			getHeader(headers, `${prefix}resetson`) || // Amazon does this [1].
			getHeader(headers, `${prefix}next`), // Akamai does this [3].
		options,
	)

	/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

	// If the reset header is not set, fallback to the retry-after header.
	const retryAfter = getHeader(headers, 'retry-after')
	if (!reset && retryAfter) reset = parseResetTime(retryAfter, options)

	return {
		info: {
			used: Number.isNaN(used) ? limit - remaining : used, // Most APIs omit this header.
			remaining,
			reset,
		},
		policy: {
			quota: {
				value: Number.isNaN(limit) ? used + remaining : limit, // Reddit omits this header.
				unit: 'requests',
			},
		},
	}
}
