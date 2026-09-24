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
test('does not also parse a valid SF header as draft 7', () => {
		// A quoted SF identifier that happens to contain draft-7-style tokens
		// should not be fed to the draft 7 parser as well.
		const headers = {
			ratelimit: '"limit=100";r=1;t=5',
		}
		const infos = getRateLimits(headers)
		expect(infos).toHaveLength(1)
		expect(infos[0]).toMatchObject({ remaining: 1 })
		expect(infos[0].limit).toBeUndefined()
	})

	test('parses policy window, quota unit, and partition key', () => {
		// RateLimit-Policy: "default";q=100;w=60;qu="content-bytes", "user";q=5;w=3600;pk=:QXBwLTk5OQ==:
		const headers = {
			'ratelimit-policy':
				'"default";q=100;w=60;qu="content-bytes", "user";q=5;w=3600;pk=:QXBwLTk5OQ==:',
		}
		const infos = getRateLimits(headers)
		const defaults = infos.find((i) => i.identifier === 'default')
		const user = infos.find((i) => i.identifier === 'user')
		expect(defaults).toMatchObject({
			limit: 100,
			window: 60,
			unit: 'content-bytes',
		})
		expect(user).toMatchObject({
			limit: 5,
			window: 3600,
			partitionKey: 'App-999',
		})
	})

	test('combines RateLimit-Policy with RateLimit by identifier', () => {
		// RateLimit-Policy: "minute";q=100;w=60
		// RateLimit: "minute";r=42;t=30
		const headers = {
			'ratelimit-policy': '"minute";q=100;w=60',
			ratelimit: '"minute";r=42;t=30',
		}
		const info = getRateLimit(headers)
		expect(info).toMatchObject({
			identifier: 'minute',
			limit: 100,
			window: 60,
			remaining: 42,
			reset: expect.any(Date),
		})
	})

	test('parses RateLimit partition key', () => {
		// RateLimit: "user";r=5;t=30;pk=:QXBwLTk5OQ==:
		const headers = {
			ratelimit: '"user";r=5;t=30;pk=:QXBwLTk5OQ==:',
		}
		const info = getRateLimit(headers)
		expect(info).toMatchObject({ partitionKey: 'App-999' })
	})

	test('parses Retry-After header', () => {
		const headers = {
			ratelimit: '"default";r=0;t=60',
			'retry-after': '35',
		}
		const info = getRateLimit(headers)
		expect(info).toMatchObject({ retryAfter: 35 })
	})
})
