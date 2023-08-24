import type {
	ServerResponse,
	IncomingHttpHeaders,
	OutgoingHttpHeaders,
} from 'node:http'
import type { RateLimit, RateLimitOptions } from './types'

// Node or fetch
export type ResponseObject = ServerResponse | Response
export type HeadersObject =
	| IncomingHttpHeaders
	| OutgoingHttpHeaders
	| Headers
	| { [key: string]: string | string[] }
export type ResponseOrHeadersObject = ResponseObject | HeadersObject

export function parseRateLimit(
	input: ResponseOrHeadersObject,
	options?: RateLimitOptions,
): RateLimit | undefined {
	if (
		'headers' in input &&
		typeof input.headers === 'object' &&
		!Array.isArray(input.headers)
	) {
		return parseHeadersObject(input.headers, options)
	}

	if ('getHeaders' in input && typeof input.getHeaders === 'function') {
		return parseHeadersObject(input.getHeaders(), options)
	}

	return parseHeadersObject(input, options)
}

function parseHeadersObject(
	input: HeadersObject,
	options: RateLimitOptions | undefined,
): RateLimit | undefined {
	const combined = getHeader(input, 'ratelimit')
	if (combined) return parseCombinedRateLimitHeader(combined)

	let prefix
	if (getHeader(input, 'ratelimit-remaining')) {
		prefix = 'ratelimit-'
	} else if (getHeader(input, 'x-ratelimit-remaining')) {
		prefix = 'x-ratelimit-'
	} else if (getHeader(input, 'x-rate-limit-remaining')) {
		// Twitter - https://developer.twitter.com/en/docs/twitter-api/rate-limits#headers-and-codes
		prefix = 'x-rate-limit-'
	} else {
		// Todo: handle other vendor-specific headers - see
		// https://github.com/ietf-wg-httpapi/ratelimit-headers/issues/25
		// https://stackoverflow.com/questions/16022624/examples-of-http-api-rate-limiting-http-response-headers
		// https://github.com/mre/rate-limits/blob/master/src/variants.rs
		// etc.
		return
	}

	const limit = number_(getHeader(input, `${prefix}limit`))
	// Used - https://github.com/reddit-archive/reddit/wiki/API#rules
	// used - https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#rate-limit-headers
	// observed - https://docs.gitlab.com/ee/administration/settings/user_and_ip_rate_limits.html#response-headers
	// note that || is valid here because used should always be at least 1, and || handles NaN correctly, whereas ?? doesn't
	const used =
		number_(getHeader(input, `${prefix}used`)) ||
		number_(getHeader(input, `${prefix}observed`))
	const remaining = number_(getHeader(input, `${prefix}remaining`))

	let reset: Date | undefined
	const resetRaw = getHeader(input, `${prefix}reset`)
	const resetType = options?.reset
	switch (resetType) {
		case 'date': {
			reset = parseResetDate(resetRaw ?? '')
			break
		}

		case 'unix': {
			reset = parseResetUnix(resetRaw ?? '')
			break
		}

		case 'seconds': {
			reset = parseResetSeconds(resetRaw ?? '')
			break
		}

		case 'milliseconds': {
			reset = parseResetMilliseconds(resetRaw ?? '')
			break
		}

		default: {
			if (resetRaw) reset = parseResetAuto(resetRaw)
			else {
				// Fallback to retry-after
				const retryAfter = getHeader(input, 'retry-after')
				if (retryAfter) {
					reset = parseResetUnix(retryAfter)
				}
			}
		}
	}

	return {
		limit: Number.isNaN(limit) ? used + remaining : limit, // Reddit omits
		used: Number.isNaN(used) ? limit - remaining : used, // Most omit
		remaining,
		reset,
	}
}

const reLimit = /limit\s*=\s*(\d+)/i
const reRemaining = /remaining\s*=\s*(\d+)/i
const reReset = /reset\s*=\s*(\d+)/i
export function parseCombinedRateLimitHeader(input: string): RateLimit {
	const limit = number_(reLimit.exec(input)?.[1])
	const remaining = number_(reRemaining.exec(input)?.[1])
	const resetSeconds = number_(reReset.exec(input)?.[1])
	const reset = secondsToDate(resetSeconds)
	return {
		limit,
		used: limit - remaining,
		remaining,
		reset,
	}
}

function secondsToDate(seconds: number): Date {
	const d = new Date()
	d.setSeconds(d.getSeconds() + seconds)
	return d
}

function number_(input: string | number | undefined): number {
	if (typeof input === 'number') return input
	return Number.parseInt(input ?? '', 10)
}

function getHeader(headers: HeadersObject, name: string): string | undefined {
	if ('get' in headers && typeof headers.get === 'function') {
		return headers.get(name) ?? undefined // Returns null if missing, but everything else is undefined for missing values
	}

	if (name in headers && typeof (headers as any)[name] === 'string') {
		return (headers as any)[name] as string
	}

	return undefined
}

function parseResetDate(resetRaw: string): Date {
	// Todo: take the server's date into account, calculate an offset, then apply that to the current date
	return new Date(resetRaw)
}

function parseResetUnix(resetRaw: string | number): Date {
	const resetNumber = number_(resetRaw)
	return new Date(resetNumber * 1000)
}

function parseResetSeconds(resetRaw: string | number): Date {
	const resetNumber = number_(resetRaw)
	return secondsToDate(resetNumber)
}

function parseResetMilliseconds(resetRaw: string | number): Date {
	const resetNumber = number_(resetRaw)
	return secondsToDate(resetNumber / 1000)
}

const reLetters = /[a-z]/i
function parseResetAuto(resetRaw: string): Date {
	// If it has any letters, assume it's a date string
	if (reLetters.test(resetRaw)) {
		return parseResetDate(resetRaw)
	}

	const resetNumber = number_(resetRaw)
	// Looks like a unix timestamp
	if (resetNumber && resetNumber > 1_000_000_000) {
		// Sometime in 2001
		return parseResetUnix(resetNumber)
	}

	// Could be seconds or milliseconds (or something else!), defaulting to seconds
	return parseResetSeconds(resetNumber)
}
