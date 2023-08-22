import type { ServerResponse, IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http'
import type {
    RateLimit,
    RateLimitOptions,
} from './types'

// node or fetch
export type ResponseObject = ServerResponse | Response; 
export type HeadersObject =  IncomingHttpHeaders | OutgoingHttpHeaders | Headers | Object;
export type ResponseOrHeadersObject = ResponseObject | HeadersObject;

export function parseRateLimit(input: ResponseOrHeadersObject, options?: RateLimitOptions): RateLimit | undefined {
    if ('headers' in input && typeof input.headers === 'object' && !Array.isArray(input.headers)) {
        return parseHeadersObject(input.headers, options)
    } else if ('getHeaders' in input && typeof input.getHeaders === 'function') {
        return parseHeadersObject(input.getHeaders(), options)
    } else {
        return parseHeadersObject(input, options)
    }
}

function parseHeadersObject(input: HeadersObject, options: RateLimitOptions | undefined): RateLimit | undefined {
    let combined = getHeader(input, 'ratelimit')
    if (combined ) return parseCombinedRateLimitHeader(combined);
    
    let prefix;
    if (getHeader(input, 'ratelimit-remaining')) {
        prefix = 'ratelimit-'
    } else if (getHeader(input, 'x-ratelimit-remaining')) {
        prefix = 'x-ratelimit-'
    } else if (getHeader(input, 'x-rate-limit-remaining')) {
        // twitter - https://developer.twitter.com/en/docs/twitter-api/rate-limits#headers-and-codes
        prefix = 'x-rate-limit-'
    } else {
        // todo: handle other vendor-specific headers - see 
        // https://github.com/ietf-wg-httpapi/ratelimit-headers/issues/25
        // https://stackoverflow.com/questions/16022624/examples-of-http-api-rate-limiting-http-response-headers
        // https://github.com/mre/rate-limits/blob/master/src/variants.rs
        // etc.
        return;
    }

    const limit = num(getHeader(input, `${prefix}limit`))
    // used - https://github.com/reddit-archive/reddit/wiki/API#rules
    // used - https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#rate-limit-headers
    // observed - https://docs.gitlab.com/ee/administration/settings/user_and_ip_rate_limits.html#response-headers
    // note that || is valid here because used should always be at least 1, and || handles NaN correctly, whereas ?? doesn't
    const used = num(getHeader(input, `${prefix}used`)) || num(getHeader(input, `${prefix}observed`))
    const remaining = num(getHeader(input, `${prefix}remaining`))

    let reset: Date|undefined = undefined;
    const resetRaw = getHeader(input, `${prefix}reset`)
    const resetType = options?.reset;
    if (resetType == 'date') reset = parseResetDate(resetRaw ?? '');
    else if (resetType == 'unix') reset = parseResetUnix(resetRaw ?? '');
    else if (resetType == 'seconds') reset = parseResetSeconds(resetRaw ?? '');
    else if (resetType == 'milliseconds') reset = parseResetMilliseconds(resetRaw ?? '');
    else if (resetRaw) reset = parseResetAuto(resetRaw)
    else {
        // fallback to retry-after
        const retryAfter = getHeader(input, 'retry-after');
        if (retryAfter) {
            reset = parseResetUnix(retryAfter)
        }
    }

    return {
        limit: isNaN(limit) ? used + remaining : limit, // reddit omits
        used: isNaN(used) ? limit - remaining : used, // most omit
        remaining,
        reset
    }
}

const reLimit = /limit\s*=\s*(\d+)/i
const reRemaining = /remaining\s*=\s*(\d+)/i
const reReset = /reset\s*=\s*(\d+)/i
export function parseCombinedRateLimitHeader(input: string): RateLimit {
    const limit = num(reLimit.exec(input)?.[1]);
    const remaining = num(reRemaining.exec(input)?.[1]);
    const resetSeconds = num(reReset.exec(input)?.[1]);
    const reset = secondsToDate(resetSeconds);
    return {
        limit,
        used: limit - remaining,
        remaining,
        reset,
    }
}

function secondsToDate(seconds: number): Date {
    const d = new Date();
    d.setSeconds(d.getSeconds() + seconds);
    return d;
}

function num(input: string | number | undefined): number {
    if (typeof input == 'number') return input;
    return parseInt(input ?? '', 10);
}

function getHeader(headers: HeadersObject, name: string): string | undefined {
    if ('get' in headers && typeof headers.get === 'function') {
        return headers.get(name) ?? undefined // returns null if missing, but everything else is undefined for missing values
    }
    return headers[name]
}

function parseResetDate(resetRaw: string): Date {
    // todo: take the server's date into account, calculate an offset, then apply that to the current date
    return new Date(resetRaw);
}

function parseResetUnix(resetRaw: string | number): Date {
    let resetNum = num(resetRaw);
    return new Date(resetNum * 1000);
}

function parseResetSeconds(resetRaw: string | number): Date {
    let resetNum = num(resetRaw);
    return secondsToDate(resetNum);
}

function parseResetMilliseconds(resetRaw: string | number): Date {
    let resetNum = num(resetRaw);
    return secondsToDate(resetNum/1000);
}

const reLetters = /[a-z]/i;
function parseResetAuto(resetRaw: string): Date {
    // if it has any letters, assume it's a date string
    if (resetRaw.match(reLetters)) {
        return parseResetDate(resetRaw)
    }
    const resetNum = num(resetRaw);
    // looks like a unix timestamp
    if (resetNum && resetNum > 1000000000) { // sometime in 2001
        return parseResetUnix(resetNum)
    }
    // could be seconds or milliseconds (or something else!), defaulting to seconds
    return parseResetSeconds(resetNum);
}