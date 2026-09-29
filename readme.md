<h1 align="center"> <code>ratelimit-header-parser</code> </h1>

<div align="center">

[![tests](https://img.shields.io/github/actions/workflow/status/express-rate-limit/ratelimit-header-parser/ci.yaml)](https://github.com/express-rate-limit/ratelimit-header-parser/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/ratelimit-header-parser.svg)](https://npmjs.org/package/ratelimit-header-parser 'View this project on NPM')
[![npm downloads](https://img.shields.io/npm/dm/ratelimit-header-parser)](https://www.npmjs.com/package/ratelimit-header-parser)
[![license](https://img.shields.io/npm/l/ratelimit-header-parser)](license.md)

</div>

This library parses `RateLimit` headers of various forms into a normalized
format. It supports the policy/limit split headers from drafts 8+ of the the
[IETF Rate Limit Headers standard](https://github.com/ietf-wg-httpapi/ratelimit-headers),
the combined format specified in
[draft 7](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-07),
the uncombined `RateLimit-*` format of earlier drafts, traditional
`X-RateLimit-*` headers, as well as proprietary formats from Amazon, Twitter,
Imgur, and others.

It's currently tested in node.js and deno, and should also work in browsers,
React Native, and other JavaScript environments.

## Installation

From the npm registry:

```sh
# Using npm
> npm install ratelimit-header-parser
# Using yarn or pnpm
> yarn/pnpm add ratelimit-header-parser
```

From Github Releases:

```sh
# Using npm
> npm install https://github.com/express-rate-limit/ratelimit-header-parser/releases/download/v{version}/ratelimit-header-parser.tgz
# Using yarn or pnpm
> yarn/pnpm add https://github.com/express-rate-limit/ratelimit-header-parser/releases/download/v{version}/ratelimit-header-parser.tgz
```

Replace `{version}` with the version of the package that you want to your, e.g.:
`1.0.0`.

## Usage Examples

```ts
import { getRateLimit } from 'ratelimit-header-parser'
// or const { getRateLimit } = require('ratelimit-header-parser')

const response = await fetch('https://api.github.com/orgs/express-rate-limit')
console.log('github ratelimit:', getRateLimit(response))

// > github ratelimit: { limit: 60, used: 3, remaining: 57, reset: 2026-09-28T19:14:49.000Z }
```

For more examples, take a look at the [`examples/`](examples/) folder.

## API

### `getRateLimit(responseOrHeaders, [options]) => object | undefined`

Scans the input for ratelimit headers in a variety of formats and returns the
result in a consistent format, or undefined if it fails to find any rate-limit
headers. If multiple ratelimits are found, it chooses the one with the lowest
remaining value.

Returns an object with the following fields, or `undefined` if it does not find
any rate-limit headers. All fields are optional, but `limit`, `remaining`, and
`reset` are usually present.

```ts
RateLimitInfo = {
	/**
	 * The identifier for this rate limit, set by the remote server.
	 * Required for the standard headers draft 8+; used to combine rate limit details across Ratelimit & Ratelimit-Policy headers.
	 * May be any arbitrary string, or undefined for earlier versions.
	 */
	identifier?: string

	/**
	 * The max number of requests (or whatever the specified unit is) that may be made to the endpoint during the time
	 * window.
	 */
	limit?: number

	/**
	 * The number of requests/etc. already made to that endpoint.
	 */
	used?: number

	/**
	 * The number of requests/etc. that can be made before reaching the rate limit.
	 */
	remaining?: number

	/**
	 * The time when the window will reset, and used & remaining counts will be reset.
	 */
	reset?: Date

	/**
	 * The period of time, in seconds, that the rate limit window lasts.
	 */
	window?: number

	/**
	 * The unit the quota is expressed in. Defaults to `requests` if not specified.
	 */
	unit?: RateLimitQuotaUnit

	/**
	 * Identifier of what the limit is being applied to - e.g. IP address, username, API key, etc.
	 * Set by the remote server.
	 * (Note: the field is base64 encoded in the header, but decoded before being exposed here.)
	 */
	partitionKey?: string

	/**
	 * The number of seconds after which the client may retry the request.
	 */
	retryAfter?: number
}
```

#### `responseOrHeaders`

> A node-style or fetch-style `Response`/`Headers` object.

#### `options`

> Options that configure how the library parses the headers.

```ts
type Options = {
	// How to parse the `reset` field. If unset, the parser will guess based on
	// the content of the header.
	reset: |
		'date' | // Pass the value to `new Date(...)` to let the JavaScript engine parse it.
		'unix' | // Treat the value as the number of seconds since January 1, 1970 (A.K.A a UNIX epoch timestamp).
		'seconds' | // Treat the value as the number of seconds from the current time.
		'milliseconds' | // Treat the value as the number of milliseconds from the current time.
}
```

### `getRateLimits(responseOrHeaders, [options]) => object[]`

For APIs that may return multiple rate limits (e.g. per client & per end-user),
this will parse and return all of them.

Result is sorted so that the limit with the lowest remaining value comes first.

Accepts the same inputs as `getRateLimit` and returns an array containing zero
or more of the same `RateLimitInfo` objects that `getRateLimit` returns.

## Issues and Contributing

If you encounter a bug or want to see something added/changed, please go ahead
and
[open an issue](https://github.com/nfriexpress-rate-limitedly/ratelimit-header-parser/issues/new)!
If you need help with something, feel free to
[start a discussion](https://github.com/express-rate-limit/ratelimit-header-parser/discussions/new)!

If you wish to contribute to the library, thanks! First, please read
[the contributing guide](contributing.md). Then you can pick up any issue and
fix/implement it!

## License

MIT © Express Rate Limit
