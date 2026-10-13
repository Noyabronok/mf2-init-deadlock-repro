import React from 'react'

export const name = 'remoteB/Page'
export const reactVersion = React.version

// Cycle edge: remote-b consumes remote-a. Never called by the repro.
export const loadWidget = () => import('remoteA/Widget')
