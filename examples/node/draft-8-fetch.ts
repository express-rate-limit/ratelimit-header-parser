// /examples/node/draft-88-fetch.ts
// Use `fetch`, and parse the `RateLimit` header from the IETF spec's 8th draft.

// Note that example has a server and client together - normally they'd be in
// separate files, likely on separate devices.

// ---
// `server.ts`
// ----

import { default as express } from 'express'
import { rateLimit } from 'express-rate-limit'

// Create a rate-limited server.
const app = express()
app.use(
	rateLimit({
		limit: 8,
		windowMs: 2 * 60 * 1000, // 2 minute windows.
		legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
		standardHeaders: 'draft-8', // Use the combined `RateLimit` header.
	}),
	rateLimit({
		limit: 45,
		windowMs: 5 * 60 * 60 * 1000, // 2 hour windows.
		legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
		standardHeaders: 'draft-8', // Use the combined `RateLimit` header.
	}),
)

// Register routes, and start the server.
app.get('/', (req, res) => res.send('Hallo there!'))
const { port, server } = await new Promise((resolve) => {
	const server = app.listen(0, () =>
		resolve({ port: server.address().port, server }),
	)
})

// ---
// `client.ts`
// ---

import { getRateLimits } from 'ratelimit-header-parser'

// Fetch a response from the server.
const response = await fetch(`http://localhost:${port}`)

console.log('`RateLimit` header content:', response.headers.get('RateLimit'))
console.log(
	'`RateLimit-Policy` header content:',
	response.headers.get('RateLimit-Policy'),
)
// > `RateLimit` header content: limit=5, remaining=4, reset=60
console.log(
	'parsed rate limit info:',
	JSON.stringify(getRateLimits(response), undefined, 2),
)
// > parsed rate limit info: { limit: 5, used: 1, remaining: 4, reset: 2023-08-25T04:41:31.546Z }

// Cleanup the server.
server.close()
