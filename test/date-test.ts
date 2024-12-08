// /test/date-test.ts
// Tests the date parsing functions.

import {
	jest,
	describe,
	test,
	expect,
	beforeEach,
	afterEach,
} from '@jest/globals'
import { parse as parseResetTime } from '../source/parsers/reset.js'

describe('date tests', () => {
	const options = { strict: true }
	const thatDay = new Date('2023-05-16T18:12:13.000Z')

	test('date string auto-detection', () => {
		const dateString = 'Tuesday, May 16, 2023 11:42:13 PM GMT+05:30'

		const parsedDate = parseResetTime(dateString, options)
		expect(parsedDate.getTime()).toBe(thatDay.getTime())
	})

	test('unix date auto-detection', () => {
		const dateString = '1684260733'

		const parsedDate = parseResetTime(dateString, options)
		expect(parsedDate.getTime()).toBe(thatDay.getTime())
	})

	// NOTE: This test doesn't work because `parseResetTime` defaults to parsing
	// the date as seconds instead of milliseconds.
	test.failing('milliseconds date auto-detection', () => {
		const dateString = '1684260733000'

		const parsedDate = parseResetTime(dateString, options)
		expect(parsedDate.getTime()).toBe(thatDay.getTime())
	})

	describe('mocked clock', () => {
		beforeEach(() => {
			jest.useFakeTimers()
		})
		afterEach(() => {
			jest.useRealTimers()
		})

		test('delta seconds auto-detection', () => {
			const now = new Date()
			const then = new Date()
			then.setSeconds(now.getSeconds() + 42)
			const dateString = '42'

			const parsedDate = parseResetTime(dateString, options)
			expect(parsedDate.getTime()).toBe(then.getTime())
		})
	})
})
