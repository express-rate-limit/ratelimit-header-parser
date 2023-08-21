import { ServerResponse, IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http'

export type RateLimit = {
    limit: number,
    current: number,
    remaining: number,
    reset?: Date,
    // todo: policy
}

export type RateLimitOptions = {
    reset?: 'date' | 'unix' | 'seconds' | 'milliseconds',
}

// node or fetch
type ResponseObject = ServerResponse | Response; 
type HeadersObject =  IncomingHttpHeaders | OutgoingHttpHeaders | Headers | Object;

export function parseRateLimit(input: ResponseObject | HeadersObject, options?: RateLimitOptions): RateLimit | undefined {
    if ('headers' in input && typeof input.headers === 'object' && !Array.isArray(input.headers)) {
        return parseRateLimit(input.headers, options)
    } else if ('getHeaders' in input && typeof input.getHeaders === 'function') {
        return parseRateLimit(input.getHeaders(), options)
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
    } else {
        // todo: handle vendor-specific headers here - see https://github.com/ietf-wg-httpapi/ratelimit-headers/issues/25
        return;
    }

    const limit = num(getHeader(input, `${prefix}limit`))
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
        limit,
        current: limit - remaining,
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
        current: limit - remaining,
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