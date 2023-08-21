import { describe, it, expect } from '@jest/globals'
import { parseCombinedRateLimitHeader } from '../source/ratelimit-header-parser'

describe('parseCombinedRateLimitHeader', () => {
    it('should parse a combined header', () => {
        expect(parseCombinedRateLimitHeader('limit=100, remaining=25, reset=5')).toMatchObject({
            limit: 100,
            remaining: 25,
            current: 75,
            reset: expect.any(Date) // todo: mock the clock, then match to a specific date
        })
    })
})