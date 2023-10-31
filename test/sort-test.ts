// /test/sort-test.ts
// Tests the sorting function.

import { describe, test, expect } from '@jest/globals'
import { remainingSortFn } from '../source/parser.js'

describe('sort tests', () => {
	test('should sort with lowest remaining values first and undefined values last', () => {
		const unknown70 = { limit: 70 }
		const unknown75 = { limit: 75 }
		const five100 = { limit: 100, remaining: 5, used: 95 }
		const five101 = { limit: 101, remaining: 5, used: 95 }
		const ten99 = { limit: 99, remaining: 10, used: 190 }
		const infos = [unknown75, five101, ten99, unknown70, five100]

		infos.sort(remainingSortFn)
		expect(infos).toMatchObject([five100, five101, ten99, unknown70, unknown75])
	})
})
