import { describe, it, expect } from '@jest/globals'
import { parseCombinedRateLimitHeader, parseRateLimit } from '../source/ratelimit-header-parser'

describe('parseRateLimitHeaders', () => {
    it ('should handle X-RateLimit-* headers in a fetch Headers object', () => {
        const headers = new Headers({
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '70',
            'X-RateLimit-Reset': Math.floor(Date.now() / 1000).toString()
        })
        expect(parseRateLimit(headers)).toMatchObject({
            limit: 100,
            remaining: 70,
            used: 30,
            reset: expect.any(Date) // todo: mock the clock, then match to a specific date
        })
    })

    // todo: test with other object types
    // todo: test with various options
})

// todo: test parseResetAuto with various formats

describe('parseCombinedRateLimitHeader', () => {
    it('should parse a combined header', () => {
        expect(parseCombinedRateLimitHeader('limit=100, remaining=25, reset=5')).toMatchObject({
            limit: 100,
            remaining: 25,
            used: 75,
            reset: expect.any(Date) // todo: mock the clock, then match to a specific date
        })
    })
})