export const name = 'remoteB/Page'

// Cycle edge: remote-b consumes remote-a. Never called by the repro.
export const loadWidget = () => import('remoteA/Widget')
