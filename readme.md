<h1 align="center"> <code>ratelimit-header-parser</code> </h1>

<div align="center">

[![tests](https://github.com/express-rate-limit/ratelimit-header-parser/actions/workflows/ci.yaml/badge.svg)](https://github.com/express-rate-limit/ratelimit-header-parser/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/ratelimit-header-parser.svg)](https://npmjs.org/package/ratelimit-header-parser 'View this project on NPM')
[![npm downloads](https://img.shields.io/npm/dm/ratelimit-header-parser)](https://www.npmjs.com/package/ratelimit-header-parser)
[![license](https://img.shields.io/npm/l/ratelimit-header-parser)](license.md)

</div>

This library parses `RateLimit` headers of various forms into a normalized
format. It supports the combined format specified in
[draft 7](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-07)
of the
[IETF Rate Limit Headers standard](https://github.com/ietf-wg-httpapi/ratelimit-headers),
the uncombined `RateLimit-*` format of earlier drafts, traditional
`X-RateLimit-*` headers, and a few other formats.

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

## Usage

### Importing

This library is provided in ESM as well as CJS forms, and works with both
Javascript and Typescript projects.

**This package requires you to use Node 16 or above.**

Import it in a CommonJS project (`type: commonjs` or no `type` field in
`package.json`) as follows:

```ts
const { rateLimit } = require('express-rate-limit')
```

Import it in a ESM project (`type: module` in `package.json`) as follows:

```ts
import { rateLimit } from 'express-rate-limit'
```

### Examples

```ts
import { getRateLimit } from 'ratelimit-header-parser'

const response = await fetch('https://api.github.com/orgs/express-rate-limit')
console.log('github ratelimit:', getRateLimit(response))

// > github ratelimit: { limit: 60, used: 1, remaining: 59, reset: 2023-08-25T04:16:48.000Z }
```

For more examples, take a look at the [`examples/`](examples/) folder.

## API

### `getRateLimit(responseOrHeaders, [options]) => object | undefined`

Scans the input for ratelimit headers in a variety of formats and returns the
result in a consistent format, or undefined if it fails to find any rate-limit
headers. If multiple ratelimits are found, it chooses the one with the lowest
remaining value.

Returns an object with the following fields, or `undefined` if it does not find
any rate-limit headers.

```ts
type RateLimitInfo = {
	limit: number
	used: number | undefined
	remaining: number | undefined
	reset: Date | undefined
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
this will parse all of them.

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
