// /source/utilities.ts
// The utility functions for the library

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
 * @return {number} - The parsed integer.
 * @throws {Error} - Thrown if the string does not contain a valid number.
 */
export const toInt = (input: string | number | undefined): number => {
	if (typeof input === 'number') return input
	return Number.parseInt(input ?? '', 10)
}
