// /source/headers.ts
// The valid rate limit header extraction function.

import type { ResponseObject, HeadersObject } from './types'

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

export const identifyingHeaders = Object.entries({
	// The draft-6 and unofficial rate limit headers.
	'ratelimit-remaining': 'ratelimit-',
	'x-ratelimit-remaining': 'x-ratelimit-',

	// Twitter headers [4].
	'x-rate-limit-remaining': 'x-rate-limit-',

	// Linear headers [5].
	'x-ratelimit-requests-remaining': 'x-ratelimit-requests-',
	'x-ratelimit-complexity-remaining': 'x-ratelimit-complexity-',

	// Imgur headers [6].
	'x-ratelimit-userremaining': 'x-ratelimit-user',
	'x-ratelimit-clientremaining': 'x-ratelimit-client',
	'x-post-rate-limit-remaining': 'x-post-rate-limit-',

	// Amazon headers [1].
	'x-mws-quota-remaining': 'x-mws-quota-',

	// TODO: handle more headers, see links [7] and [8].
})

/**
 * Extracts the headers from a node/fetch-style response/headers object.
 *
 * @param input {ResponseObject | HeadersObject} - The object to parse.
 *
 * @return {HeadersObject} - The headers extracted from the object.
 */
export const getHeaderObject = (
	input: ResponseObject | HeadersObject,
): HeadersObject => {
	if (
		'headers' in input &&
		typeof input.headers === 'object' &&
		!Array.isArray(input.headers)
	) {
		// The input is a fetch-style response object, the headers are a property on
		// the object.
		return input.headers
	}

	if ('getHeaders' in input && typeof input.getHeaders === 'function') {
		// The input is a node `ServerResponse` object, get the headers using the
		// `getHeaders` function.
		return input.getHeaders()
	}

	if ('getSetCookie' in input && typeof input.getSetCookie === 'function') {
		// The input is a node-style response object.
		return input as HeadersObject
	}

	// The input is a JSON object that contains all the headers. Make sure all
	// the header names are in lower case.
	return Object.fromEntries(
		Object.entries(input).map(([k, v]) => [k.toLowerCase(), v]),
	) as HeadersObject
}

/**
 * Returns a header (or undefined if it's not present) from the passed
 * node/fetch-style header object.
 *
 * @param headers {HeadersObject} - The headers in the response.
 * @param name {string} - The name of the header to return.
 *
 * @returns {string | undefined} - The contents of the header.
 */
export const getHeader = (
	headers: HeadersObject,
	name: string,
): string | undefined => {
	if ('get' in headers && typeof headers.get === 'function')
		return headers.get(name) ?? undefined // Returns null if missing, but everything else is undefined for missing values

	if (name in headers && typeof (headers as any)[name] === 'string')
		return (headers as any)[name] as string

	return undefined
}

/**
 * Finds the root prefix for custom rate limit headers, e.g., `X-RateLimit-`,
 * `X-MWS-Quota-`, etc. If none are found, it returns an empty array.
 *
 * @param headers {HeadersObject} - The headers to search in.
 *
 * @returns {string[]} - The prefixes, if any are found.
 */
export const getNonStandardHeaders = (headers: HeadersObject): string[] => {
	const prefixes = []
	for (const [identifyingHeader, rateLimitHeader] of identifyingHeaders)
		if (getHeader(headers, identifyingHeader)) prefixes.push(rateLimitHeader)

	return prefixes
}
