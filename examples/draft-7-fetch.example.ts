// /examples/draft-7-fetch.example.ts
// Use `fetch`, and parse the `RateLimit` header from the IETF spec's 7th draft.

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
		max: 5,
		windowMs: 60 * 1000, // 1 minute windows.
		legacyHeader: false, // Disable the `X-RateLimit-*` headers.
		standardHeaders: 'draft-7', // Use the combined `RateLimit` header.
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

import { parseRateLimit } from 'ratelimit-header-parser'

// Fetch a response from the server.
const response = await fetch(`http://localhost:${port}`)

console.log('`RateLimit` header content:', response.headers.get('RateLimit'))
// > `RateLimit` header content: limit=5, remaining=4, reset=60
console.log('parsed rate limit info:', parseRateLimit(response))
// > parsed rate limit info: { limit: 5, used: 1, remaining: 4, reset: 2023-08-25T04:41:31.546Z }

// Cleanup the server.
server.close()
