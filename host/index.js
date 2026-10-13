const out = document.getElementById('log')
const log = (msg) => {
  out.textContent += `${msg}\n`
  console.log(msg)
}

const gap = Number(new URLSearchParams(location.search).get('gap') ?? 100)
const start = performance.now()
const elapsed = () => `${Math.round(performance.now() - start)}ms`

const track = (id, load) => {
  log(`${elapsed()} import('${id}') started`)
  const timeout = new Promise((resolve) => setTimeout(() => resolve('pending'), 5000))
  Promise.race([load().then(() => 'resolved'), timeout]).then((result) => {
    log(result === 'resolved' ? `${elapsed()} ${id} resolved` : `${id} still pending after 5s: DEADLOCK`)
  })
}

log(`gap between the two imports: ${gap}ms`)
track('remoteA/Widget', () => import('remoteA/Widget'))
setTimeout(() => track('remoteB/Page', () => import('remoteB/Page')), gap)
