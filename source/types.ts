export type RateLimit = {
    limit: number,
    used: number,
    remaining: number,
    reset?: Date,
    // todo: policy
}

export type RateLimitOptions = {
    reset?: 'date' | 'unix' | 'seconds' | 'milliseconds',
}
