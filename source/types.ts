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
 * The rate limit information gleaned from the response/headers object passed
 * to the parser.
 */
export type RateLimitInfo = {
	/**
	 * The max number of requests one can make to that endpoint in the stipulated
	 * window.
	 */
	limit: number

	/**
	 * The number of requests already made to that endpoint.
	 */
	used: number

	/**
	 * The number of requests that can be made before reaching the rate limit.
	 */
	remaining: number

	/**
	 * The timestamp at which the window resets, and one's hit count is set to zero.
	 */
	reset?: Date

	// TODO: policy
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
