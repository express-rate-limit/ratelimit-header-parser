export type RateLimit = {
	limit: number
	used: number
	remaining: number
	reset?: Date
	// Todo: policy
}

export type RateLimitOptions = {
	reset?: 'date' | 'unix' | 'seconds' | 'milliseconds'
}
