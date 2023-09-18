# <div align="center"> RateLimit Header Parser </div>

<div align="center">

[![tests](https://github.com/express-rate-limit/ratelimit-header-parser/actions/workflows/ci.yaml/badge.svg)](https://github.com/express-rate-limit/ratelimit-header-parser/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/ratelimit-header-parser.svg)](https://npmjs.org/package/ratelimit-header-parser 'View this project on NPM')
[![npm downloads](https://img.shields.io/npm/dm/ratelimit-header-parser)](https://www.npmjs.com/package/ratelimit-header-parser)

</div>

This library parses `RateLimit` headers of various forms into a normalized
format. It supports the combined format specified in
[draft 7](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-07)
of the
[IETF Rate Limit Headers standard](https://github.com/ietf-wg-httpapi/ratelimit-headers),
the uncombined `RateLimit-*` format of earlier drafts, traditional
`X-RateLimit-*` headers, and a few other formats.

## Usage

```ts
import { getRateLimit } from 'ratelimit-header-parser'

const response = await fetch(
	'https://api.github.com/repos/express-rate-limit/express-rate-limit/contributors?anon=1',
)

console.log('github ratelimit:', getRateLimit(response))
// > github ratelimit: { limit: 60, used: 1, remaining: 59, reset: 2023-08-25T04:16:48.000Z }
```

For more examples, take a look at the [`examples/`](examples/) folder.

## API

### `getRateLimit(responseOrHeaders, [options]) => object | undefined`

Scans the input for ratelimit headers in a variety of formats and returns the
result in a consistent format, or undefined if it fails to find any rate-limit
headers. Returns an object with the following fields, or `undefined` if it does
not find any rate-limit headers.

```ts
type RateLimitInfo = {
	limit: number
	used: number
	remaining: number
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
