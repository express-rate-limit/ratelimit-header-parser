// /source/parser/reset.ts
// The parser for the `*-Reset` header.

import type { ParserOptions } from '../types'
import { secondsToDate, toInt } from '../utilities.js'

const converters = {
	// TODO: take the server's date into account, calculate an offset, then apply that to the current date
	date: (header: string): Date => new Date(header),
	unix: (header: string | number): Date => new Date(toInt(header) * 1000),
	seconds: (header: string | number): Date => secondsToDate(toInt(header)),
	milliseconds: (header: string | number): Date =>
		secondsToDate(toInt(header) / 1000),
}

/**
 * Find out what type of time is passed in the `RateLimit-Reset` header, and
 * parse it into a `Date`.
 */
const getDateFromString = (header: string): Date => {
	// If it has any letters, assume it's a date string.
	if (/[a-z]/i.test(header)) return converters['date'](header)

	// Else, assume it is a unix timestamp, or a duration in seconds.
	const resetNumber = toInt(header)
	if (resetNumber && resetNumber > 1_000_000_000 /* Sometime in 2001 */)
		return converters['unix'](resetNumber)

	return converters['seconds'](resetNumber)
}

/**
 * Parses the `RateLimit-Reset` header's contents and returns a proper `Date`.
 *
 * @param header {string | undefined} - The header's contents.
 * @param options {Partial<ParserOptions>} - The parser's configuration.
 *
 * @return {Date | undefined} - The exact date/time at which the rate limit resets.
 */
export const parse = (
	header: string | undefined,
	options: Partial<ParserOptions>,
): Date | undefined => {
	if (!header) return undefined

	// If the kind of format to expect in the reset header is not mentioned, try
	// figuring it out by ourselves. Otherwise, use the specified converter to
	// return a valid date.
	if (!options?.resetTimeFormat) return getDateFromString(header)
	return converters[options.resetTimeFormat](header)
}
