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
 * The rate limit info extracted from the header.
 */
export type RateLimitInfo = {
	/**
	 * The measure of activity by the client in the current window.
	 */
	used: number

	/**
	 * The measure of activity that can be done before reaching the rate limit.
	 */
	remaining: number

	/**
	 * The timestamp at which the measure of activity of the client is reset.
	 */
	reset: Date
}

/**
 * The rate limiting policy of the server.
 */
export type RateLimitPolicy = {
	/**
	 * The name of the rate limiting policy.
	 */
	name: string

	/**
	 * The maximum measure of the activity a client is allowed in the given window.
	 */
	quota: {
		value: number
		unit: 'requests' | 'content-bytes' | 'concurrent-requests'
	}

	/**
	 * The interval of time in which the activity of the client is measured and
	 * limited by the quota.
	 */
	window: number

	/**
	 * The partition 'key' used to divide server capacity across different clients
	 * and users. The method for generating one is determined by the server.
	 */
	partition: string
}

/**
 * The rate limit information extracted from the response/headers object passed
 * to the parser.
 */
export type ParsedRateLimit = {
	/**
	 * The rate limit info extracted from the header.
	 */
	info?: Partial<RateLimitInfo>

	/**
	 * The rate limiting policy of the server.
	 */
	policy?: Partial<RateLimitPolicy>
}

/**
 * Options that configure how the library parses the headers.
 */
export type ParserOptions = {
	/**
	 * Whether or not to throw errors upon encountering problems while parsing
	 * the input headers.
	 *
	 * Defaults to `false`.
	 */
	strict: boolean

	/**
	 * How to parse any reset time encountered. If unset, the parser will guess
	 * based on the content of the header.
	 */
	resetTimeFormat:
		| 'date' // Pass the value to `new Date(...)` to let the JavaScript engine parse it.
		| 'unix' // Treat the value as the number of seconds since January 1, 1970 (A.K.A a UNIX epoch timestamp).
		| 'seconds' // Treat the value as the number of seconds from the current time.
		| 'milliseconds' // Treat the value as the number of milliseconds from the current time.
}
