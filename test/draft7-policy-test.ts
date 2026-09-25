// /test/draft7-policy-test.ts
// Tests for draft-7 (draft-ietf-httpapi-ratelimit-headers-07) parsing:
// the `RateLimit-Policy` quota-policy header and the combined `RateLimit` field.

import { describe, test, expect } from '@jest/globals'
import {
	parseDraft7Header,
	getRateLimit,
	getRateLimits,
} from '../source/parser.js'

describe('draft 7 policy parsing', () => {
	describe('RateLimit-Policy quota policies', () => {
		test('parses the quota and window from a single policy', () => {
			// Draft 7 §2.1: a quota policy is an Integer (the service limit)
			// with a REQUIRED `w` parameter.
			const headers = {
				'ratelimit-policy': '100;w=60',
			}
			const info = getRateLimit(headers)
			expect(info).toMatchObject({ limit: 100, window: 60 })
		})

		test('parses multiple policies', () => {
			// Draft 7 §3.5, example: multiple windows in one list.
			const headers = {
				'ratelimit-policy': '10;w=1, 50;w=60, 1000;w=3600, 5000;w=86400',
			}
			const infos = getRateLimits(headers)
			expect(infos).toHaveLength(4)
			expect(infos.map((i) => [i.limit, i.window])).toEqual([
				[10, 1],
				[50, 60],
				[1000, 3600],
				[5000, 86_400],
			])
		})

		test('ignores extension parameters', () => {
			// Draft 7 §2.1: other parameters are allowed as comments.
			const headers = {
				'ratelimit-policy': '100;w=60;comment="fixed window"',
			}
			const info = getRateLimit(headers)
			expect(info).toMatchObject({ limit: 100, window: 60 })
		})

		test('does not let a q parameter override the quota', () => {
			// Draft 7 §2.1: other parameters are comments even if they share a
			// name with a draft 8+ parameter, so `q` must not override the
			// integer quota.
			const headers = {
				'ratelimit-policy': '100;q=5;w=60',
			}
			const info = getRateLimit(headers)
			expect(info).toMatchObject({ limit: 100, window: 60 })
		})

		test('accepts a zero-valued window', () => {
			// Draft 7 §2.3: the time window is a non-negative Integer.
			const headers = {
				'ratelimit-policy': '100;w=0',
			}
			const info = getRateLimit(headers)
			expect(info).toMatchObject({ limit: 100, window: 0 })
		})

		test('keeps a policy when the window is absent', () => {
			// `w` is REQUIRED per draft 7 §2.1, but we are lenient by default:
			// surface the quota (and anything else present) rather than
			// dropping the item. Strict mode is future work.
			const headers = {
				'ratelimit-policy': '100;qu="requests"',
			}
			const info = getRateLimit(headers)
			expect(info).toMatchObject({ limit: 100, unit: 'requests' })
			expect(info?.window).toBeUndefined()
		})
	})

	describe('combined RateLimit header', () => {
		test('parses the draft 7 combined header', () => {
			const info = parseDraft7Header('limit=100, remaining=50, reset=30')
			expect(info).toMatchObject({ limit: 100, remaining: 50 })
			expect(info?.used).toBe(50)
			expect(info?.reset).toBeInstanceOf(Date)
		})

		test('parses alongside a RateLimit-Policy header', () => {
			// Draft 7 §B.2.1 shape: the window is conveyed via the policy.
			const headers = {
				ratelimit: 'limit=100, remaining=99, reset=50',
				'ratelimit-policy': '100;w=60',
			}
			const infos = getRateLimits(headers)
			expect(infos).toHaveLength(2)
			const rateLimit = infos.find((i) => i.limit === 100 && i.reset)
			const policy = infos.find((i) => i.limit === 100 && i.window === 60)
			expect(rateLimit).toMatchObject({
				remaining: 99,
				reset: expect.any(Date),
			})
			expect(policy).toBeDefined()
		})

		test('parses a limit of zero', () => {
			// Draft 7 §B.2.3: `RateLimit: limit=0, remaining=0, reset=20`.
			const info = parseDraft7Header('limit=0, remaining=0, reset=20')
			expect(info).toMatchObject({ limit: 0, remaining: 0 })
			expect(info?.reset).toBeInstanceOf(Date)
		})

		test('sorts a zero-limit policy as the most restrictive', () => {
			// A 429 response (limit=0, no remaining) must sort before a
			// positive-limit policy with the same (undefined) remaining.
			const headers = {
				'ratelimit-policy': '100;w=60, 0;w=60',
			}
			const infos = getRateLimits(headers)
			expect(infos[0]).toMatchObject({ limit: 0, window: 60 })
		})

		test('keeps partial info when reset is absent (lenient)', () => {
			// Draft 7 §3.1 marks `reset` REQUIRED and §5 says malformed fields
			// MUST be ignored; we stay lenient for now (strict mode is future
			// work) and surface the limit without fabricating a reset.
			const info = getRateLimit({ ratelimit: 'limit=10' })
			expect(info).toMatchObject({ limit: 10 })
			expect(info?.reset).toBeUndefined()
		})
	})
})
