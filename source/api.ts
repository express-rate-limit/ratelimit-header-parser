// /source/main.ts
// The public API of this package.

import type {
	ResponseObject,
	HeadersObject,
	ParsedRateLimit,
	ParserOptions,
} from './types'
import { getHeaderObject, getNonStandardHeaders } from './headers.js'
import { parseDraftHeader, parseNonStandardHeaders } from './parsers/index.js'
import { rateLimitSorter } from './utilities.js'

/**
 * Parses the passed response/headers object and returns rate limit information
 * extracted from one of: `RateLimit-`, `X-RateLimit-`, etc.
 *
 * @param input {ResponseObject | HeadersObject} - The node/fetch-style response/headers object.
 * @param passedOptions {Partial<ParserOptions> | undefined} - The configuration for the parser.
 *
 * @returns {ParsedRateLimit | undefined} - The rate limit information parsed from the headers.
 */
export const getRateLimit = (
	input: ResponseObject | HeadersObject,
	passedOptions?: Partial<ParserOptions>,
): ParsedRateLimit | undefined => {
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
 * @returns {ParsedRateLimit[]} - The rate limit information parsed from the headers.
 */
export const getRateLimits = (
	input: ResponseObject | HeadersObject,
	passedOptions?: Partial<ParserOptions>,
): ParsedRateLimit[] => {
	// Default to no configuration, and get the headers object from the input.
	const options = passedOptions ?? {}
	const headers = getHeaderObject(input)

	// If the header complies with any IETF draft spec, parse it accordingly.
	const draftRateLimits = parseDraftHeader(headers, options)

	// Otherwise, find the type of non standard headers sent by the server.
	const prefixes = getNonStandardHeaders(headers)
	if (prefixes.length === 0) return draftRateLimits

	// Parse each of the rate limit headers found.
	const rateLimits = draftRateLimits
	for (const prefix of prefixes) {
		const result = parseNonStandardHeaders(headers, options, prefix)
		if (result !== undefined) rateLimits.push(result)
	}

	// Sort them that the limit with the lowest remaining value comes first.
	rateLimits.sort(rateLimitSorter)

	return rateLimits
}
