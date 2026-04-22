// /examples/node/http-get.ts
// Uses `http.get` to hit the Imgur API.

import https from 'node:https'
import { getRateLimits } from 'ratelimit-header-parser'

// Make a GET request to the Imgur API.
https.get('https://api.imgur.com/post/v1/posts/t/aww', (response) => {
	console.log('imgur ratelimit:', getRateLimits(response))
	return response.resume()
})

// > imgur ratelimit: { limit: 500, used: 1, remaining: 499, reset: 2023-09-19T14:19:30.297Z }
// >                  { limit: 12500, used: 1, remaining: 12499, reset: 2023-09-19T14:19:30.297Z }
