// Enabled with DEBUG=1. Logs container init and shared loads per federation instance.
export default function debugPlugin() {
  const log = (origin, msg) => console.log(`[${Math.round(performance.now())}ms] ${origin.name}: ${msg}`)
  const scope = (initScope) => `initScope=[${initScope.map((token) => token.from).join(',')}]`
  return {
    name: 'debug-plugin',
    beforeRequest(args) {
      log(args.origin, `request ${args.id}`)
      return args
    },
    beforeInitContainer(args) {
      log(args.origin, `init ${args.remoteInfo.name} start ${scope(args.initScope)}`)
      return args
    },
    initContainer(args) {
      log(args.origin, `init ${args.remoteInfo.name} done`)
      return args
    },
    beforeLoadShare(args) {
      log(args.origin, `loadShare ${args.pkgName} start`)
      return args
    },
    afterLoadShare(args) {
      log(args.origin, `loadShare ${args.pkgName} done`)
    }
  }
}
