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
 * Parses the passed response/headers object and returns rate limit information.
 *
 * @param input {ResponseObject | HeadersObject} - The node/fetch-style response/headers object.
 * @param passedOptions {Partial<ParserOptions> | undefined} - The configuration for the parser.
 *
 * @returns {RateLimitInfo | undefined} - The rate limit information parsed from the headers.
 */
export function parseRateLimit(
	input: ResponseObject | HeadersObject,
	passedOptions?: Partial<ParserOptions>,
): RateLimitInfo | undefined {
	// Default to no configuration.
	const options = passedOptions ?? {}

	// Get the headers object from the passed input.
	let headers: HeadersObject
	if (
		'headers' in input &&
		typeof input.headers === 'object' &&
		!Array.isArray(input.headers)
	)
		headers = input.headers
	else if ('getHeaders' in input && typeof input.getHeaders === 'function')
		headers = input.getHeaders()
	else headers = input as HeadersObject

	// Parse the headers.
	return parseHeaders(headers, options)
}

/**
 * The header parser function.
 */
const parseHeaders = (
	headers: HeadersObject,
	options: Partial<ParserOptions>,
): RateLimitInfo | undefined => {
	// If the header is a combined header, parse it according to the 7th draft of
	// the IETF spec.
	const draft7Header = getHeader(headers, 'ratelimit')
	if (draft7Header) return parseDraft7Header(draft7Header)

	// Find the prefix for the headers, e.g., `X-RateLimit-`, `RateLimit-`, etc.
	const prefix = findPrefix(headers)
	if (!prefix) return

	const limit = toInt(getHeader(headers, `${prefix}limit`))

	// Note that `||` is valid here because used should always be at least 1, and
	// `||` handles NaN correctly, whereas `??` doesn't.
	const used = toInt(
		getHeader(headers, `${prefix}used`) || // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
			getHeader(headers, `${prefix}observed`),
	)
	const remaining = toInt(getHeader(headers, `${prefix}remaining`))

	// Try parsing the reset header passed in the response.
	let reset = parseResetHeader(getHeader(headers, `${prefix}reset`), options)
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
 * @returns {string | undefined} - The prefix, if any is found.
 */
const findPrefix = (headers: HeadersObject): string | undefined => {
	// The draft-6 and unofficial rate limit headers.
	if (getHeader(headers, 'ratelimit-remaining')) return 'ratelimit-'
	if (getHeader(headers, 'x-ratelimit-remaining')) return 'x-ratelimit-'

	// Twitter - https://developer.twitter.com/en/docs/twitter-api/rate-limits#headers-and-codes
	if (getHeader(headers, 'x-rate-limit-remaining')) return 'x-rate-limit-'

	// TODO: handle other vendor-specific headers - see
	// https://github.com/ietf-wg-httpapi/ratelimit-headers/issues/25
	// https://stackoverflow.com/questions/16022624/examples-of-http-api-rate-limiting-http-response-headers
	// https://github.com/mre/rate-limits/blob/master/src/variants.rs
	// etc.
	return undefined
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
