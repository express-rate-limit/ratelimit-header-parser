// /test/sf-test.ts
// Tests for Structured Fields (SF) parsing of RateLimit headers.

import { describe, test, expect } from '@jest/globals'
import { getRateLimit, getRateLimits } from '../source/parser.js'

describe('structured fields (SF) parsing', () => {
	test('parses single RateLimit SF header', () => {
		// Example: RateLimit: "default";r=42;t=60
		const headers = {
			ratelimit: '"default";r=42;t=60',
		}
		const info = {
			remaining: 42,
			reset: expect.any(Date),
		}
		expect(getRateLimit(headers)).toMatchObject(info)
	})

	test('parses multiple RateLimit SF items', () => {
		// Example: RateLimit: "minute";r=10;t=60, "hour";r=100;t=3600
		const headers = {
			ratelimit: '"minute";r=10;t=60, "hour";r=100;t=3600',
		}
		const infos = getRateLimits(headers)
		expect(infos.length).toBeGreaterThanOrEqual(2)
		expect(infos[0]).toMatchObject({ remaining: 10, reset: expect.any(Date) })
		expect(infos[1]).toMatchObject({ remaining: 100, reset: expect.any(Date) })
	})

	test('parses RateLimit-Policy SF header', () => {
		// Example: RateLimit-Policy: "default";q=100;w=60;qu="requests"
		const headers = {
			'ratelimit-policy': '"default";q=100;w=60;qu="requests"',
		}
		const infos = getRateLimits(headers)
		expect(infos.length).toBeGreaterThanOrEqual(1)
		expect(infos[0]).toMatchObject({ limit: 100 })
	})

	test('falls back to legacy parsing if SF fails', () => {
		// Malformed SF, should fallback to legacy
		const headers = {
			ratelimit: 'limit=50, remaining=10, reset=5',
		}
		const info = getRateLimit(headers)
		expect(info).toMatchObject({
			limit: 50,
			remaining: 10,
			reset: expect.any(Date),
		})
	})
})
