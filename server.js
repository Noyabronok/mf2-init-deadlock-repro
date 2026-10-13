const http = require('http')
const fs = require('fs')
const path = require('path')

const types = { '.js': 'text/javascript', '.html': 'text/html' }

// Stands in for a slow network: remote-b's entry takes a while, so the host
// can request it while remote-a's init is still waiting for it.
const SLOW_PATH = '/remote-b/remoteEntry.js'
const SLOW_MS = 1000

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const file =
      url.pathname === '/'
        ? path.join(__dirname, 'static', 'index.html')
        : path.join(__dirname, 'dist', path.normalize(url.pathname))
    const delay = url.pathname === SLOW_PATH ? SLOW_MS : 0
    setTimeout(() => {
      fs.readFile(file, (err, body) => {
        if (err) {
          res.writeHead(404).end()
          return
        }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' })
        res.end(body)
      })
    }, delay)
  })
  .listen(3000, () => console.log('http://localhost:3000/?gap=100 (hangs)  http://localhost:3000/?gap=2000 (works)'))
