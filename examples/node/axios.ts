// /examples/node/axios.ts
// Uses `axios` to hit the GitHub API.

import axios from 'axios'
import { getRateLimit } from 'ratelimit-header-parser'

// Make a GET request to the GitHub API.
const response = await axios('https://api.github.com/orgs/express-rate-limit')
console.log('github ratelimit:', getRateLimit(response))

// > github ratelimit: { limit: 60, used: 1, remaining: 59, reset: 2023-08-25T04:16:48.000Z }
