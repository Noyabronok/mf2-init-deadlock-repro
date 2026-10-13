export const name = 'remoteA/Widget'

// Cycle edge: remote-a consumes remote-b. Never called by the repro.
export const loadPage = () => import('remoteB/Page')
