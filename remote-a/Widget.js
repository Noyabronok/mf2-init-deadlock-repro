import React from 'react'

export const name = 'remoteA/Widget'
export const reactVersion = React.version

// Cycle edge: remote-a consumes remote-b. Never called by the repro.
export const loadPage = () => import('remoteB/Page')
