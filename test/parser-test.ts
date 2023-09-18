// /test/parser-test.ts
// Tests for the public API.

import { describe, it, expect } from '@jest/globals'
import { parseDraft7Header, getRateLimit } from '../source/parser.js'

const itif = (condition: boolean) => (condition ? it : it.skip)

describe('getRateLimit', () => {
	// Note: Headers doesn't exist in node 16 or older
	itif(typeof Headers !== 'undefined')(
		'should handle X-RateLimit-* headers in a fetch Headers object',
		() => {
			const headers = new Headers({
				'X-RateLimit-Limit': '100',
				'X-RateLimit-Remaining': '70',
				'X-RateLimit-Reset': Math.floor(Date.now() / 1000).toString(),
			})
			expect(getRateLimit(headers)).toMatchObject({
				limit: 100,
				remaining: 70,
				used: 30,
				reset: expect.any(Date), // Todo: mock the clock, then match to a specific date
			})
		},
	)

	it('should handle RateLimit-* headers in a node-style headers object', () => {
		const headers = {
			'ratelimit-limit': '60',
			'ratelimit-remaining': '20',
			'ratelimit-reset': new Date().toISOString(),
		}
		expect(getRateLimit(headers)).toMatchObject({
			limit: 60,
			remaining: 20,
			used: 40,
			reset: expect.any(Date), // Todo: mock the clock, then match to a specific date
		})
	})

	// Todo: test with other object types
	// todo: test with various options
})

// Todo: test parseResetAuto with various formats

describe('parseDraft7Header', () => {
	it('should parse a combined header', () => {
		expect(parseDraft7Header('limit=100, remaining=25, reset=5')).toMatchObject(
			{
				limit: 100,
				remaining: 25,
				used: 75,
				reset: expect.any(Date), // Todo: mock the clock, then match to a specific date
			},
		)
	})
})
