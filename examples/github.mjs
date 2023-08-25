import { parseRateLimit } from 'ratelimit-header-parser'

const response = await fetch("https://api.github.com/repos/express-rate-limit/express-rate-limit/contributors?anon=1&per_page=100", {
    "credentials": "omit",
    "headers": {
        "Accept": "application/vnd.github.v3+json",
    },
    "method": "GET",
    "mode": "cors"
});

console.log( 'github ratelimit:', parseRateLimit(response) );
// > github ratelimit: { limit: 60, used: 1, remaining: 59, reset: 2023-08-25T04:16:48.000Z }