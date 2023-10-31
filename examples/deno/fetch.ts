// /examples/deno/fetch.ts
// Uses `fetch` to hit the Imgur API.

import { getRateLimit } from '../../dist/index.mjs'

// Make a GET request to the Imgur API.
const response = await fetch('https://api.imgur.com/post/v1/posts/t/aww')
console.log('imgur ratelimit:', getRateLimit(response))

// > imgur ratelimit: { limit: 500, used: 1, remaining: 499, reset: 2023-08-25T04:16:48.000Z }
