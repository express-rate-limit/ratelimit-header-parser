// This example has a server and client together - normally they'd be in separate JS files,
// likely on separate devices.

// server
import { default as express} from 'express'
import { rateLimit } from  'express-rate-limit'
const app = express()

app.use(rateLimit({
    max: 5,
    windowMs: 60*1000, // 1 minute
    legacyHeader:  false, // X-RateLimit-*
    standardHeaders: 'draft-7' // combined RateLimit header
}))

app.get('/', (req, res) => res.send('check headers'));

const {port, server} = await new Promise(resolve => {
    const server = app.listen(0, () => resolve({port: server.address().port, server}))
})


// client
import { parseRateLimit } from 'ratelimit-header-parser'

const response = await fetch(`http://localhost:${port}`,)

console.log('RateLimit header:', response.headers.get('RateLimit'))
// > RateLimit header: limit=5, remaining=4, reset=60
console.log('parsed ratelimit:', parseRateLimit(response))
// > parsed ratelimit: { limit: 5, used: 1, remaining: 4, reset: 2023-08-25T04:41:31.546Z }


// cleanup
server.close()