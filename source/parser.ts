// /source/ratelimit-header-parser.ts
// The parser and associated functions.

import type {
	ResponseObject,
	HeadersObject,
	RateLimitInfo,
	ParserOptions,
} from './types'
import { secondsToDate, toInt, getHeader } from './utilities.js'

/**
 * The following links might be referred to in the below lines of code:
 *
 * [1]: https://github.com/ietf-wg-httpapi/ratelimit-headers/issues/25
 * [2]: https://docs.gitlab.com/ee/administration/settings/user_and_ip_rate_limits.html#response-headers
 * [3]: https://techdocs.akamai.com/adaptive-media-delivery/reference/rate-limiting
 * [4]: https://developer.twitter.com/en/docs/twitter-api/rate-limits#headers-and-codes
 * [5]: https://developers.linear.app/docs/graphql/working-with-the-graphql-api/rate-limiting#api-request-limits
 * [6]: https://apidocs.imgur.com/
 * [7]: https://stackoverflow.com/questions/16022624/examples-of-http-api-rate-limiting-http-response-headers
 * [8]: https://github.com/mre/rate-limits/blob/master/src/headers/variants.rs
 */

/**
 * Parses the passed response/headers object and returns rate limit information
 * extracted from one of: `RateLimit-`, `X-RateLimit-`, etc. See the `findPrefixes`
 * function for the order in which the parser searches for headers.
 *
 * @param input {ResponseObject | HeadersObject} - The node/fetch-style response/headers object.
 * @param passedOptions {Partial<ParserOptions> | undefined} - The configuration for the parser.
 *
 * @returns {RateLimitInfo | undefined} - The rate limit information parsed from the headers.
 */
export const getRateLimit = (
	input: ResponseObject | HeadersObject,
	passedOptions?: Partial<ParserOptions>,
): RateLimitInfo | undefined => {
	const rateLimits = getRateLimits(input, passedOptions)
	return rateLimits.length === 0 ? undefined : rateLimits[0]
}

/**
 * Parses the passed response/headers object and returns rate limit information
 * extracted from ALL rate limit headers the parser can find.
 *
 * @param input {ResponseObject | HeadersObject} - The node/fetch-style response/headers object.
 * @param passedOptions {Partial<ParserOptions> | undefined} - The configuration for the parser.
 *
 * @returns {RateLimitInfo[]} - The rate limit information parsed from the headers.
 */
export const getRateLimits = (
	input: ResponseObject | HeadersObject,
	passedOptions?: Partial<ParserOptions>,
): RateLimitInfo[] => {
	// Default to no configuration.
	const options = passedOptions ?? {}

	// Get the headers object from the passed input.
	let headers: HeadersObject
	if (
		'headers' in input &&
		typeof input.headers === 'object' &&
		!Array.isArray(input.headers)
	) {
		// The input is a fetch-style response object, the headers are a property on
		// the object.
		headers = input.headers
	} else if ('getHeaders' in input && typeof input.getHeaders === 'function') {
		// The input is a node `ServerResponse` object, get the headers using the
		// `getHeaders` function.
		headers = input.getHeaders()
	} else if (
		'getSetCookie' in input &&
		typeof input.getSetCookie === 'function'
	) {
		// The input is a node-style response object.
		headers = input as HeadersObject
	} else {
		// The input is a JSON object that contains all the headers. Make sure all
		// the header names are in lower case.
		headers = Object.fromEntries(
			Object.entries(input).map(([k, v]) => [k.toLowerCase(), v]),
		) as HeadersObject
	}

	// If the header is a combined header, parse it according to the 7th draft of
	// the IETF spec.
	const draft7Header = getHeader(headers, 'ratelimit')
	const draft7RateLimit = draft7Header
		? parseDraft7Header(draft7Header)
		: undefined

	// Find the type of headers sent by the server, e.g., `X-RateLimit-`, `RateLimit-`, etc.
	const prefixes = findPrefixes(headers)
	if (prefixes.length === 0) return []

	// Parse each of the rate limit headers found.
	const rateLimits = [draft7RateLimit]
	for (const prefix of prefixes)
		rateLimits.push(parseHeaders(headers, options, prefix))

	// Return all non-undefined rate limits.
	return rateLimits.filter((info) => info !== undefined) as RateLimitInfo[]
}

/**
 * The header parser function.
 */
const parseHeaders = (
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
	let reset = parseResetHeader(
		getHeader(headers, `${prefix}reset`) ||
			getHeader(headers, `${prefix}resettime`) || // Yelp does this [1].
			getHeader(headers, `${prefix}resetson`) || // Amazon does this [1].
			getHeader(headers, `${prefix}next`), // Akamai does this [3].
		options,
	)

	/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

	// If the reset header is not set, fallback to the retry-after header.
	const retryAfter = getHeader(headers, 'retry-after')
	if (!reset && retryAfter) reset = parseResetUnix(retryAfter)

	return {
		limit: Number.isNaN(limit) ? used + remaining : limit, // Reddit omits this header.
		used: Number.isNaN(used) ? limit - remaining : used, // Most APIs omit this header.
		remaining,
		reset,
	}
}

/**
 * Finds the prefix for the rate limit headers, e.g., `X-RateLimit-`,
 * `RateLimit-`, etc. If none are found, it returns undefined.
 *
 * @param headers {HeadersObject} - The headers to search in.
 *
 * @returns {string[]} - The prefix, if any is found.
 */
const findPrefixes = (headers: HeadersObject): string[] => {
	const prefixes = []

	// The draft-6 and unofficial rate limit headers.
	if (getHeader(headers, 'ratelimit-remaining')) prefixes.push('ratelimit-')
	if (getHeader(headers, 'x-ratelimit-remaining')) prefixes.push('x-ratelimit-')

	// Twitter does this [4].
	if (getHeader(headers, 'x-rate-limit-remaining'))
		prefixes.push('x-rate-limit-')

	// Linear does this [5].
	if (getHeader(headers, 'x-ratelimit-requests-remaining'))
		prefixes.push('x-ratelimit-requests-')
	if (getHeader(headers, 'x-ratelimit-complexity-remaining'))
		prefixes.push('x-ratelimit-complexity-')

	// Imgur does this [6].
	if (getHeader(headers, 'x-ratelimit-userremaining'))
		prefixes.push('x-ratelimit-user')
	if (getHeader(headers, 'x-ratelimit-clientremaining'))
		prefixes.push('x-ratelimit-client')
	if (getHeader(headers, 'x-post-rate-limit-remaining'))
		prefixes.push('x-post-rate-limit-')

	// Amazon does this [1].
	if (getHeader(headers, 'x-mws-quota-remaining')) prefixes.push('x-mws-quota-')

	// TODO: handle more headers, see links [7] and [8].
	return prefixes
}

/**
 * The regexps used to parse the `RateLimit` header.
 */
const reLimit = /limit\s*=\s*(\d+)/i
const reRemaining = /remaining\s*=\s*(\d+)/i
const reReset = /reset\s*=\s*(\d+)/i

/**
 * Parses a `RateLimit` header in accordance with the IETF spec's draft 7.
 *
 * @param header {string} - The contents of the `RateLimit` header.
 *
 * @returns {RateLimitInfo} - The normalised rate limit info.
 */
export const parseDraft7Header = (header: string): RateLimitInfo => {
	const limit = toInt(reLimit.exec(header)?.[1])
	const remaining = toInt(reRemaining.exec(header)?.[1])
	const resetSeconds = toInt(reReset.exec(header)?.[1])
	const reset = secondsToDate(resetSeconds)

	return {
		limit,
		used: limit - remaining,
		remaining,
		reset,
	}
}

/**
 * Parses the `RateLimit-Reset` header's contents and returns a proper `Date`.
 *
 * @param header {string} - The header's contents.
 */
const parseResetHeader = (
	passedHeader: string | undefined,
	options: Partial<ParserOptions>,
): Date | undefined => {
	const header = passedHeader ?? ''

	let reset: Date | undefined
	switch (options?.reset) {
		case 'date': {
			reset = parseResetDate(header)
			break
		}

		case 'unix': {
			reset = parseResetUnix(header)
			break
		}

		case 'seconds': {
			reset = parseResetSeconds(header)
			break
		}

		case 'milliseconds': {
			reset = parseResetMilliseconds(header)
			break
		}

		default: {
			reset = header ? parseResetAuto(header) : undefined
		}
	}

	return reset
}

/**
 * Parses the `Date` in the `RateLimit-Reset` header.
 */
const parseResetDate = (header: string): Date =>
	// TODO: take the server's date into account, calculate an offset, then apply that to the current date
	new Date(header)

/**
 * Parses a unix epoch timestamp pased in the `RateLimit-Reset` header.
 */
const parseResetUnix = (header: string | number): Date =>
	new Date(toInt(header) * 1000)

/**
 * Converts the delta seconds in the `RateLimit-Reset` header to a proper date.
 */
const parseResetSeconds = (header: string | number): Date =>
	secondsToDate(toInt(header))

/**
 * Converts the delta milliseconds in the `RateLimit-Reset` header to a proper date.
 */
const parseResetMilliseconds = (header: string | number): Date =>
	secondsToDate(toInt(header) / 1000)

/**
 * Find out what type of time is passed in the `RateLimit-Reset` header, and
 * parse it into a `Date`.
 */
const parseResetAuto = (header: string): Date => {
	// If it has any letters, assume it's a date string.
	if (/[a-z]/i.test(header)) return parseResetDate(header)

	const resetNumber = toInt(header)
	// Looks like a unix timestamp, parse it as such.
	if (resetNumber && resetNumber > 1_000_000_000)
		// Sometime in 2001
		return parseResetUnix(resetNumber)

	// Could be seconds or milliseconds (or something else!), defaulting to seconds.
	return parseResetSeconds(resetNumber)
}
