const path = require('path')
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack')

const ORIGIN = 'http://localhost:3000'

const runtimePlugins = process.env.DEBUG ? [require.resolve('./debug-plugin.js')] : []

const app = (name, federation) => ({
  name,
  mode: 'development',
  devtool: false,
  entry: `./${name}/index.js`,
  output: {
    path: path.resolve(__dirname, 'dist', name),
    publicPath: `${ORIGIN}/${name}/`,
    clean: true
  },
  plugins: [new ModuleFederationPlugin({ dts: false, manifest: false, runtimePlugins, ...federation })]
})

module.exports = [
  // Remotes use the MF2 default shareStrategy ('version-first').
  app('remote-a', {
    name: 'remoteA',
    filename: 'remoteEntry.js',
    exposes: { './Widget': './remote-a/Widget.js' },
    remotes: { remoteB: `remoteB@${ORIGIN}/remote-b/remoteEntry.js` },
    shared: { dep: { import: false } }
  }),
  app('remote-b', {
    name: 'remoteB',
    filename: 'remoteEntry.js',
    exposes: { './Page': './remote-b/Page.js' },
    remotes: { remoteA: `remoteA@${ORIGIN}/remote-a/remoteEntry.js` },
    shared: { dep: { import: false } }
  }),
  app('host', {
    name: 'host',
    shareStrategy: 'loaded-first',
    remotes: {
      remoteA: `remoteA@${ORIGIN}/remote-a/remoteEntry.js`,
      remoteB: `remoteB@${ORIGIN}/remote-b/remoteEntry.js`
    }
  })
]
