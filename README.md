# Module Federation 2 remote init deadlock

Minimal reproduction of a deadlock in `@module-federation/enhanced` 2.9.2 (webpack). Two remotes that list each other as remotes and declare a `shared` entry, plus a host that loads both. No framework and no runtime dependencies. If the host imports the second remote while the first remote's init is still waiting for the second remote's entry, both imports stay pending forever. No error is thrown and no exposed chunk is requested.

## Setup

- `host` uses `shareStrategy: 'loaded-first'` and lazily imports `remoteA/Widget`, then `remoteB/Page` after `?gap=<ms>`.
- `remote-a` and `remote-b` use the default `shareStrategy` (`version-first`) and reference each other. The cross imports are lazy and never called.
- Both remotes declare a placeholder `shared: { dep: { import: false } }`. Nothing imports it. The host declares no `shared`.
- `server.js` delays `remote-b/remoteEntry.js` by 1000ms to stand in for a slow network.

## Run

```sh
npm install
npm start
```

- http://localhost:3000/?gap=100 hangs. Both imports report `still pending after 5s: DEADLOCK`.
- http://localhost:3000/?gap=2000 works. Both imports resolve.

## Expected

Both imports resolve regardless of when the second one starts.

## Actual

| `gap` (ms) | result |
| --- | --- |
| 0, 100, 300, 600, 900 | deadlock, every run |
| 1500, 2000 | resolves |

Any gap that starts the second import while `remote-b/remoteEntry.js` is still loading deadlocks.

## Variations

| change | result |
| --- | --- |
| remove `shared` from both remotes | resolves |
| share `react` 18.3.1 as a singleton instead of `dep` (eager in the host) | deadlocks the same way |
| remove the `remoteB` remote and the `remoteB/Page` import from `remote-a` (no cycle) | resolves |
| `shareStrategy: 'loaded-first'` on both remotes | resolves |
| `shareStrategy: 'version-first'` on the host | deadlocks at every gap, including 2000 |

Without any `shared` entry, webpack emits its plain sharing runtime instead of the federation override of `__webpack_require__.I` (`bundlerRuntime.I`), so remotes are not eagerly initialized during container init.

## Trace

`DEBUG=1 npm start` adds `debug-plugin.js` to all three builds. It logs container init and shared loads per federation instance. At `?gap=100`:

```
[39ms]   host: init remoteA start initScope=[]
[39ms]   remoteA: request remoteB              remote-a's version-first init starts loading remote-b's entry
[131ms]  host: request remoteB/Page            joins the same in-flight entry load
[1050ms] host: init remoteB start initScope=[]
[1050ms] remoteA: init remoteB start initScope=[remoteA]
[1050ms] remoteB: request remoteA
[1052ms] remoteB: init remoteA start initScope=[remoteB]
         nothing finishes
```

1. When remote-b's entry arrives, the host's chain reaches remote-b's `initializeSharing` (`webpack-bundler-runtime/dist/initializeSharing.js`) first, with a fresh `initScope`. It pushes remote-b's token and stores a pending `initPromises.default`. With `version-first`, that promise waits for remote-b's own remotes, so remote-b starts initializing remote-a with `initScope=[remoteB]`.
2. remote-a's chain calls remote-b's init with `initScope=[remoteA]`. remote-b's token is not in that array, so the cycle guard misses and it returns remote-b's pending promise. remote-a now waits on remote-b.
3. remote-b's init of remote-a reaches remote-a's `initializeSharing` with `initScope=[remoteB]`. remote-a's token is not in that array either, so it returns remote-a's pending promise. remote-b now waits on remote-a.

Each `initScope` only holds the tokens of its own chain, so the guard can't see a cycle that spans two chains.

## Candidate fix

In `initializeSharing.js`, a nested call (one whose `initScope` already holds another container's token) returns instead of awaiting the container's pending init:

```diff
-		if (promise) return promise;
+		if (promise) return initScope.length > 1 ? void 0 : promise;
```

Patched locally in `node_modules`, every gap from 0 to 2000ms resolves. This matches what the cycle guard already does when both calls share one `initScope`.

## Versions

`@module-federation/enhanced` 2.9.2, `webpack` 5.110.3, `webpack-cli` 7.2.3, Node 24.21.0, Chromium (Playwright).
