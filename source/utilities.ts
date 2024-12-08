// /source/utilities.ts
// The utility functions for the library.

import type { ParsedRateLimit, RateLimitPolicy } from './types.js'

/**
 * Makes a type partial, recursively: https://stackoverflow.com/a/51365037
 */
type RecursivePartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? RecursivePartial<U>[]
		: T[P] extends object | undefined
		? RecursivePartial<T[P]>
		: T[P]
}

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
 * @param input {any | undefined} - The input to convert to a number.
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
 * @param input {any | undefined} - The input to convert to a number.
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
 * This function sorts an array of `ParsedRateLimit` objects by comparing the
 * `remaining`, and then the `quota` properties, whith lower values coming
 * first, and undefined remaining values coming after defined ones.
 *
 * @param a {ParsedRateLimit}
 * @param b {ParsedRateLimit}
 *
 * @returns number
 */
export const rateLimitSorter = (
	a: ParsedRateLimit,
	b: ParsedRateLimit,
): number => {
	const aDefined = a.info?.remaining !== undefined
	const bDefined = b.info?.remaining !== undefined

	if (a.info?.remaining === b.info?.remaining)
		return (a.policy?.quota?.value ?? 0) - (b.policy?.quota?.value ?? 0)
	if (aDefined && !bDefined) return -1
	if (!aDefined && bDefined) return 1

	return a.info!.remaining! - b.info!.remaining!
}

/**
 * Create a default policy when no policy exists, from the parsed limit.
 *
 * @param limit {number} - The quota parsed from the `RateLimit` header.
 *
 * @returns {Partial<RateLimitPolicy>}
 */
export const createDefaultPolicy = (
	limit: number,
): Partial<RateLimitPolicy> => {
	return {
		quota: {
			value: limit,
			unit: 'requests',
		},
	}
}

/**
 * Construct the `ParsedRateLimit` object from all the details extracted from
 * the headers.
 *
 * @returns {ParsedRateLimit}
 */
export const constructParsedRateLimit = (details: {
	info?: {
		limit?: number
		remaining?: number
		reset?: Date
	}
	policy?: RecursivePartial<RateLimitPolicy>
}): ParsedRateLimit => {
	const { limit, remaining, reset } = details.info ?? {}

	// Construct the info based on whatever information is well-defined.
	const info =
		limit !== undefined && remaining !== undefined
			? { used: limit - remaining, remaining, reset }
			: remaining !== undefined || reset !== undefined
			? { ...(remaining && { remaining }), ...(reset && { reset }) }
			: undefined

	// Determine the policy, defaulting to generating a limit-based policy if no
	// policy is provided.
	const policy =
		details.policy ??
		(limit === undefined ? undefined : createDefaultPolicy(limit))

	// Construct parsed the parsed rate limit object.
	return {
		...(info && { info }),
		...(policy && { policy }),
	} as ParsedRateLimit
}
