import { ServerResponse, IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http'

export type RateLimit = {
    limit: number,
    current: number,
    remaining: number,
    reset?: Date,
    // todo: policy
}

type ResponseOrHeadersObject = 
    /* Node.js things */
    ServerResponse | IncomingHttpHeaders | OutgoingHttpHeaders |
    /* fetch things */
    Response | Headers;

export function parseRateLimitHeaders(input: ResponseOrHeadersObject): RateLimit | undefined {
    if ('headers' in input && typeof input.headers === 'object' && !Array.isArray(input.headers)) {
        return parseRateLimitHeaders(input.headers)
    } else if ('getHeaders' in input && typeof input.getHeaders === 'function') {
        return parseRateLimitHeaders(input.getHeaders())
    }
    if (input['ratelimit']) {
        return parseCombinedRateLimitHeader(input['ratelimit'])
    }
    // todo: handle individual headers
}

const reLimit = /limit\s*=\s*(\d+)/i
const reRemaining = /remaining\s*=\s*(\d+)/i
const reReset = /reset\s*=\s*(\d+)/i
export function parseCombinedRateLimitHeader(input: string): RateLimit {
    const limit = parseInt(reLimit.exec(input)?.[1] ?? '-1', 10);
    const remaining = parseInt(reRemaining.exec(input)?.[1] ?? '-1', 10);
    const resetSeconds = reReset.exec(input)?.[1] ?? '-1';
    const reset = secondsToDate(resetSeconds);
    return {
        limit,
        current: limit - remaining,
        remaining,
        reset,
    }
}

function secondsToDate(seconds: string | number): Date {
    const d = new Date();
    d.setSeconds(d.getSeconds() + (+seconds));
    return d;
}