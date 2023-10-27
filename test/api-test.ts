// /test/parser-test.ts
// Tests for the public API.

import { describe, test, expect } from '@jest/globals'
import {
	parseDraft7Header,
	getRateLimit,
	getRateLimits,
} from '../source/parser.js'

describe('api tests', () => {
	test('json header object parsing', () => {
		const headers = {
			'X-Rate-Limit-Limit': '500',
			'X-Rate-Limit-Remaining': '499',
			'X-Rate-Limit-Reset': Date.now().toString(),
		}
		const info = {
			limit: 500,
			remaining: 499,
			used: 1,
			reset: expect.any(Date),
		}

		expect(getRateLimit(headers)).toMatchObject(info)
	})

	test('multiple header parsing', () => {
		const headers = {
			'X-RateLimit-ClientLimit': '1000',
			'X-RateLimit-ClientRemaining': '999',
			'X-RateLimit-ClientReset': Date.now().toString(),

			'X-RateLimit-UserLimit': '60',
			'X-RateLimit-UserRemaining': '42',
			'X-RateLimit-UserReset': Date.now().toString(),
		}

		// NOTE: the result is sorted by remaining values with smallest first
		const infos = [
			{
				limit: 60,
				remaining: 42,
				used: 18,
				reset: expect.any(Date),
			},
			{
				limit: 1000,
				remaining: 999,
				used: 1,
				reset: expect.any(Date),
			},
		]

		expect(getRateLimits(headers)).toMatchObject(infos)
	})

	test('combined header (draft 7) parsing', () => {
		const header = 'limit=100, remaining=25, reset=5'
		const info = {
			limit: 100,
			remaining: 25,
			used: 75,
			reset: expect.any(Date),
		}

		expect(parseDraft7Header(header)).toMatchObject(info)
	})
})
