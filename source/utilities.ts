// /source/utilities.ts
// The utility functions for the library.

import type { RateLimitInfo } from './types.js'

/**
 * Adds the given number of seconds to the current time and returns a `Date`.
 *
 * @param seconds {number} - The number of seconds to add to the current time.
 *
 * @return {Date} - The date, with a timestamp n seconds from now.
 */
export const secondsToDate = (seconds: number): Date => {
	const date = new Date()
	date.setSeconds(date.getSeconds() + seconds)
	return date
}

/**
 * Converts a string/number to a number.
 *
 * @param input {string | number | undefined} - The input to convert to a number.
 *
 * @return {number} - The parsed integer. May be NaN for unparseable input.
 */
export const toInt = (input: string | number | undefined): number => {
	if (typeof input === 'number') return input
	return Number.parseInt(input ?? '', 10)
}

/**
 * Converts a string/number to a number or undefined.
 *
 * @param input {string | number | undefined} - The input to convert to a number.
 *
 * @return {number | undefined} - The parsed integer.
 */
export const toIntOrUndefined = (
	input: string | number | undefined,
): number | undefined => {
	const number_ = toInt(input)
	return Number.isNaN(number_) ? undefined : number_
}

/**
 * This function sorts an array of `RateLimitInfo` objects by comparing the
 * `remaining`, and then the `limit` properties, whith lower values coming
 * first, and undefined remaining values coming after defined ones.
 *
 * @param a {RateLimitInfo}
 * @param b {RateLimitInfo}
 *
 * @returns number
 */
export const rateLimitSorter = (a: RateLimitInfo, b: RateLimitInfo): number => {
	const aDefined = a.remaining !== undefined
	const bDefined = b.remaining !== undefined

	if (a.remaining === b.remaining) return a.limit - b.limit
	if (aDefined && !bDefined) return -1
	if (!aDefined && bDefined) return 1

	return a.remaining! - b.remaining!
}
