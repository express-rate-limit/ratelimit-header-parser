// /test/parser-test.ts
// Tests for the public API.

import { describe, it, expect } from '@jest/globals'
import {
	parseDraft7Header,
	getRateLimit,
	getRateLimits,
} from '../source/parser.js'

const itif = (condition: boolean) => (condition ? it : it.skip)

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

	// NOTE: the `Header` class doesn't exist in node 16 or older.
	itif(typeof Headers !== 'undefined')(
		'should handle headers in a fetch-style headers object',
		() => {
			expect(getRateLimit(new Headers(headers))).toMatchObject(info)
		},
	)

	it('should handle headers in a node-style headers object', () => {
		expect(getRateLimit(headers)).toMatchObject(info)
	})

	it('should handle headers in a node `ServerResponse` object', () => {
		const response = new Response('Hallo!', { headers })

		expect(getRateLimit(response)).toMatchObject(info)
	})
})

describe('api tests', () => {
	it('should parse a header and return the parsed info', () => {
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

	it('should parse multiple headers and return all of them', () => {
		const headers = {
			'X-RateLimit-ClientLimit': '1000',
			'X-RateLimit-ClientRemaining': '999',
			'X-RateLimit-ClientReset': Date.now().toString(),

			'X-RateLimit-UserLimit': '60',
			'X-RateLimit-UserRemaining': '42',
			'X-RateLimit-UserReset': Date.now().toString(),
		}

		// NOTE: the order in which the parsed info is returns depends on the order
		// of detection in `source/parsers.ts#findPrefixes`.
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

	it('should parse a combined header', () => {
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

// TODO: test options
// TODO: test `parseResetAuto` with various formats
