# ratelimit-header-parser

[![CI](https://github.com/express-rate-limit/ratelimit-header-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/express-rate-limit/ratelimit-header-parser/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ratelimit-header-parser.svg)](https://npmjs.org/package/ratelimit-header-parser 'View this project on NPM')

Parse RateLimit headers of various forms into a normalized format. Supports the
combined form from
[draft 7](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-07)
of the
[IETF Rate Limit Headers standard](https://github.com/ietf-wg-httpapi/ratelimit-headers),
the uncombined `RateLimit-*` format of earlier drafts, traditional
`X-RateLimit-*` headers, and a few other formats.

## Usage:

```js
import { parseRateLimit } from 'ratelimit-header-parser'

const response = await fetch(
	'https://api.github.com/repos/express-rate-limit/express-rate-limit/contributors?anon=1',
)

console.log('github ratelimit:', parseRateLimit(response))
// > github ratelimit: { limit: 60, used: 1, remaining: 59, reset: 2023-08-25T04:16:48.000Z }
```

## API

### parseRateLimit(responseOrHeadersObject, [options]) => Object | undefined

Scans the input for ratelimit headers in a variety of formats and returns the
result in a consistent format, or undefined if it fails to find any ratelimit
headers.

- `responseOrHeadersObject`: May be either a fetch-style Response or Headers
  object or a node.js-style response or headers object
- `options`: Optional object with the following optional fields:
  - `reset`: How to parse the reset field. If unset, the parser will guess based
    on the content. Accepts the following strings:
    - `'date'`: past the value to `new Date(...)` to let the JavaScript engine
      parse it
    - `'unix'`: treat the value as the number of seconds since January 1, 1970
      (A.K.A a unix timestamp)
    - `'seconds'`: treat the value as the number of seconds from the current
      time
    - `'milliseconds'`: treat the value as the number of milliseconds from the
      current time

Returns a object with the following fields, or undefined if it does not find any
rate-limit headers.

```
{
	limit: number
	used: number
	remaining: number
	reset: Date or undefined
}
```
