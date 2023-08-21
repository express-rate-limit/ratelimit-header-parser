import type { ServerResponse, IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http'

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
export type ResponseObject = ServerResponse | Response; 
export type HeadersObject =  IncomingHttpHeaders | OutgoingHttpHeaders | Headers | Object;
export type ResponseOrHeadersObject = ResponseObject | HeadersObject;