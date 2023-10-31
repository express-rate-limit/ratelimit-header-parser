// /test/input-test.ts
// Tests the types of objects the library can parse.

import { describe, test, expect } from '@jest/globals'
import { getRateLimit } from '../source/parser.js'

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
