// /source/types.ts
// All the types used by this package.

import type {
	ServerResponse,
	IncomingHttpHeaders,
	OutgoingHttpHeaders,
} from 'node:http'

/**
 * The parser accepts node/fetch style response and header objects.
 */
export type ResponseObject = ServerResponse | Response
export type HeadersObject =
	| IncomingHttpHeaders
	| OutgoingHttpHeaders
	| Headers
	| { [key: string]: string | string[] }

/**
 * The units in which a rate limit quota may be expressed, per the updated
 * `RateLimit-Policy` draft.
 */
export type RateLimitQuotaUnit =
	| 'requests'
	| 'content-bytes'
	| 'concurrent-requests'

/**
 * The rate limit information gleaned from the response/headers object passed
 * to the parser.
 */
export type RateLimitInfo = {
	/**
	 * The identifier for this rate limit, set by the remote server.
	 * Required for the standard headers draft 8+; used to combine rate limit details across Ratelimit & Ratelimit-Policy headers.
	 * May be any arbitrary string, or undefined for earlier versions.
	 */
	identifier?: string

	/**
	 * The max number of requests (or whatever the specified unit is) that may be made to the endpoint during the time
	 * window.
	 */
	limit?: number

	/**
	 * The number of requests/etc. already made to that endpoint.
	 */
	used?: number

	/**
	 * The number of requests/etc. that can be made before reaching the rate limit.
	 */
	remaining?: number

	/**
	 * The time when the window will reset, and used & remaining counts will be reset.
	 */
	reset?: Date

	/**
	 * The period of time, in seconds, that the rate limit window lasts.
	 */
	window?: number

	/**
	 * The unit the quota is expressed in. Defaults to `requests` if not specified.
	 */
	unit?: RateLimitQuotaUnit

	/**
	 * Identifier of what the limit is being applied to - e.g. IP address, username, API key, etc.
	 * Optional, set by the remote server.
	 * (Note: the field is base64 encoded in the header, but decoded before being exposed here.)
	 */
	partitionKey?: string

	/**
	 * The number of seconds to wait before retrying the request.
	 */
	retryAfter?: number
}

/**
 * Options that configure how the library parses the headers.
 */
export type ParserOptions = {
	/**
	 * How to parse the `reset` field. If unset, the parser will guess based on
	 * the content of the header.
	 */
	reset:
		| 'date' // Pass the value to `new Date(...)` to let the JavaScript engine parse it.
		| 'unix' // Treat the value as the number of seconds since January 1, 1970 (A.K.A a UNIX epoch timestamp).
		| 'seconds' // Treat the value as the number of seconds from the current time.
		| 'milliseconds' // Treat the value as the number of milliseconds from the current time.
}
