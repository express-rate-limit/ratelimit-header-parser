// /source/parser/ietf-draft.ts
// The parser for headers following the IETF draft specification (v7+).

import { parseList, parseDictionary as parseDict } from 'structured-headers'
import type {
	ParsedRateLimit,
	RateLimitPolicy,
	HeadersObject,
	ParserOptions,
} from '../types'
import { getHeader } from '../headers.js'
import { toIntOrUndefined, constructParsedRateLimit } from '../utilities.js'
import { parse as parseResetTime } from './reset.js'

type QuotaUnit = RateLimitPolicy['quota']['unit']

// Utility type for the parsed structured header policy.
type ParsedValue = string | number | undefined
type ParsedParameters = Map<string, ParsedValue[]>
type ParsedHeaderPolicy = {
	value: string | number
	params: ParsedParameters
}

// Utility type for the parsed structured header entries.
type ParsedDraft7Header = ParsedParameters
type ParsedDraft8Header = Array<[string, ParsedParameters]>

/**
 * Attempts to parse header using the 7th draft of the specification.
 *
 * @param header {string} - The `RateLimit` header's contents.
 * @param options {Partial<ParserOptions>} - The parser's configuration.
 *
 * @returns {ParsedDraft7Header | undefined} - The parsed header, if the contents are valid.
 */
const tryParsingDraft7 = (
	header: string,
	options: Partial<ParserOptions>,
): ParsedDraft7Header | undefined => {
	try {
		return parseDict(header) as ParsedDraft7Header
	} catch {
		return undefined
	}
}

/**
 * Attempts to parse header using the 8th draft of the specification.
 *
 * @param header {string} - The `RateLimit` header's contents.
 * @param options {Partial<ParserOptions>} - The parser's configuration.
 *
 * @returns {ParsedDraft8Header | undefined} - The parsed header, if the contents are valid.
 */
const tryParsingDraft8 = (
	header: string,
	options: Partial<ParserOptions>,
): ParsedDraft8Header | undefined => {
	try {
		return parseList(header) as ParsedDraft8Header
	} catch {
		return undefined
	}
}

/**
 * Attempts to parse policies from the `RateLimit-Policy` header for either the
 * 7th or 8th draft of the spec.
 *
 * @param header {string} - The `RateLimit-Policy` header's contents.
 *
 * @returns {ParsedHeaderPolicy[]} - The list of policies specified in the header.
 */
function parsePolicies(header?: string): ParsedHeaderPolicy[] {
	if (!header) return []

	try {
		return parseList(header).map((policy) => ({
			value: policy[0],
			params: policy[1],
		})) as ParsedHeaderPolicy[]
	} catch {
		return []
	}
}

/**
 * Processes rate limit information from the header as per the 7th draft.
 *
 * @param draft7 {ParsedDraft7Header} - The parsed `RateLimit` structured header.
 * @param policies {ParsedHeaderPolicy[]} - The parsed `RateLimit-Policy` structured header.
 * @param options {Partial<ParserOptions>} - The parser's configuration.
 *
 * @return {ParsedRateLimit[]} - The parsed rate limit information.
 */
function processDraft7Limits(
	draft7: ParsedDraft7Header,
	policies: ParsedHeaderPolicy[],
	options: Partial<ParserOptions>,
): ParsedRateLimit[] {
	const limit = toIntOrUndefined(draft7.get('limit')?.[0])
	const remaining = toIntOrUndefined(draft7.get('remaining')?.[0])
	const reset = parseResetTime(draft7.get('reset')?.[0] as ParsedValue, options)
	const info = { limit, remaining, reset }

	// Make sure limit exists in strict mode, since it is required by the draft.
	if (limit === undefined && options?.strict) {
		throw new Error(
			`Failed to parse 'RateLimit' header: 'limit' is not a number.`,
		)
	}

	// If no policies exist, create a single rate limit with the policy straight
	// from the `RateLimit` header.
	if (policies.length === 0 && limit !== undefined) {
		return [constructParsedRateLimit({ info })]
	}

	// Map policies to rate limits
	return policies.map((parsedPolicy) => {
		const policy = {
			quota: {
				value: parsedPolicy.value as number,
				unit: 'requests' as QuotaUnit,
			},
			window: toIntOrUndefined(parsedPolicy.params.get('w')),
		}

		return constructParsedRateLimit({
			info: limit === parsedPolicy.value ? info : undefined,
			policy,
		})
	})
}

/**
 * Processes rate limit information from the header as per the 8th draft.
 *
 * @param draft8 {ParsedDraft8Header} - The parsed `RateLimit` structured header.
 * @param policies {ParsedHeaderPolicy[]} - The parsed `RateLimit-Policy` structured header.
 * @param options {Partial<ParserOptions>} - The parser's configuration.
 *
 * @return {ParsedRateLimit[]} - The parsed rate limit information.
 */
function processDraft8Limits(
	draft8: ParsedDraft8Header,
	policies: ParsedHeaderPolicy[],
	options: Partial<ParserOptions>,
): ParsedRateLimit[] {
	// If no policies exist, create rate limits and their policies directly from
	// the `RateLimit` header.
	if (policies.length === 0) {
		return draft8.map(([name, parameters]) => {
			// There is no `q` in the draft, but if there is no policy header, maybe
			// the server has sent it along with the `RateLimit` header? If not,
			// default to the value of `remaining` as the limit.
			const limit = toIntOrUndefined(parameters.get('q') ?? parameters.get('r'))
			const remaining = toIntOrUndefined(parameters.get('r'))
			const reset = parseResetTime(parameters.get('t') as ParsedValue, options)

			const info = { limit, remaining, reset }
			const policy = {
				name,
				quota: {
					value: limit,
					unit: 'requests' as QuotaUnit,
				},
			}

			return constructParsedRateLimit({ info, policy })
		})
	}

	// If an accompanying policy header was found, map each policy to the
	// corresponding info.
	return draft8.flatMap(([name, headerParameters]) => {
		const reset = parseResetTime(
			headerParameters.get('t') as ParsedValue,
			options,
		)

		return policies.map(({ value, params: policyParameters }) => {
			// Give precedence to the value of partition key in the `RateLimit` header
			// over the `RateLimit-Policy` header, even though the both should be same.
			const partition = (headerParameters.get('pk')?.value ??
				policyParameters.get('pk')?.value) as string | undefined
			const remaining = toIntOrUndefined(headerParameters.get('r'))
			const window = toIntOrUndefined(policyParameters.get('w'))
			const limit = toIntOrUndefined(policyParameters.get('q'))
			const unit = (policyParameters.get('qu') ?? 'requests') as QuotaUnit

			const info = { limit, remaining, reset }
			const policy = {
				name,
				quota: {
					value: limit,
					unit,
				},
				window,
				partition,
			}

			return constructParsedRateLimit({ info, policy })
		})
	})
}

/**
 * Parses standard headers as per the IETF draft specification.
 *
 * @param headers - The object containing headers to parse.
 * @param options - The parser's configuration.
 * @returns An array of parsed rate limit information.
 */
export const parse = (
	headers: HeadersObject,
	options: Partial<ParserOptions> = {},
): ParsedRateLimit[] => {
	const header = getHeader(headers, 'ratelimit')
	const policyHeader = getHeader(headers, 'ratelimit-policy')

	// If no rate limit header is present, return an empty array.
	if (!header) return []

	// Attempt to parse headers with different draft specifications.
	const draft7 = tryParsingDraft7(header, options)
	const draft8 = tryParsingDraft8(header, options)

	// Parse policies if the policy header exists.
	const policies = parsePolicies(policyHeader)

	// Combine the parsed rate limits with the corresponding policies.
	return [
		...(draft7 ? processDraft7Limits(draft7, policies, options) : []),
		...(draft8 ? processDraft8Limits(draft8, policies, options) : []),
	]
}
