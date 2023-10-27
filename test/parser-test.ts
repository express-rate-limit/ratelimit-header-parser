// /test/parser-test.ts
// Tests for the public API.

import { describe, test, expect } from '@jest/globals'
import {
	parseDraft7Header,
	parseResetAuto,
	getRateLimit,
	getRateLimits,
} from '../source/parser.js'

const testIf = (condition: boolean) => (condition ? test : test.skip)

describe('input tests', () => {
	const headers = {
		'X-RateLimit-Limit': '100',
		'X-RateLimit-Remaining': '70',
		'X-RateLimit-Reset': Date.now().toString(),
	}
	const info = {
		limit: 100,
		remaining: 70,
		used: 30,
		reset: expect.any(Date),
	}

	// NOTE: the `Header` and `Response` classes don't exist in node 16 or older.
	testIf(typeof Headers !== 'undefined')(
		'fetch-style headers object parsing',
		() => {
			expect(getRateLimit(new Headers(headers))).toMatchObject(info)
		},
	)

	testIf(typeof Response !== 'undefined')(
		'fetch-style response object parsing',
		() => {
			const response = new Response('Hallo!', { headers })

			expect(getRateLimit(response)).toMatchObject(info)
		},
	)

	test('node-style headers object parsing', () => {
		expect(getRateLimit(headers)).toMatchObject(info)
	})
})

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

describe('date tests', () => {
	const thatDay = new Date('2023-05-16T18:12:13.000Z')

	test('date string auto-detection', () => {
		const dateString = 'Tuesday, May 16, 2023 11:42:13 PM GMT+05:30'

		const parsedDate = parseResetAuto(dateString)
		expect(parsedDate.getTime()).toBe(thatDay.getTime())
	})

	test('unix date auto-detection', () => {
		const dateString = '1684260733'

		const parsedDate = parseResetAuto(dateString)
		expect(parsedDate.getTime()).toBe(thatDay.getTime())
	})

	test('delta seconds auto-detection', () => {
		const now = new Date()
		const then = new Date()
		then.setSeconds(now.getSeconds() + 42)
		const dateString = '42'

		const parsedDate = parseResetAuto(dateString)
		expect(parsedDate.getTime()).toBe(then.getTime())
	})
})
