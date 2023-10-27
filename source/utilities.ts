// /source/utilities.ts
// The utility functions for the library.

import type { HeadersObject } from './types.js'

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
 * Returns a header (or undefined if it's not present) from the passed
 * node/fetch-style header object.
 *
 * @param headers {HeadersObject} - The headers in the response.
 * @param name {string} - The name of the header to return.
 *
 * @returns {string | undefined} - The contents of the header.
 */
export const getHeader = (
	headers: HeadersObject,
	name: string,
): string | undefined => {
	if ('get' in headers && typeof headers.get === 'function')
		return headers.get(name) ?? undefined // Returns null if missing, but everything else is undefined for missing values

	if (name in headers && typeof (headers as any)[name] === 'string')
		return (headers as any)[name] as string

	return undefined
}
