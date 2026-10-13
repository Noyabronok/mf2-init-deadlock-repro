# AGENTS.md

Minimal repro of a Module Federation 2 remote init deadlock in `@module-federation/enhanced` 2.9.2 (webpack). The [README](README.md) has the symptom, variations, trace, mechanism and candidate fix. This file covers how to run and verify it.

## Rules

- Keep the repro minimal. Every file should be needed to trigger or observe the deadlock.
- No runtime dependencies. Exact versions in `package.json` (no `^` or `~`).
- Never commit `node_modules` or `dist`.

## Layout

- `webpack.config.js` builds three apps into `dist/`. `host` uses `shareStrategy: 'loaded-first'`. `remote-a` and `remote-b` use the default `version-first` and list each other as remotes. Both remotes share `dep.js`, a one-line local module that nothing imports. Declaring it is what makes webpack emit the federation sharing runtime.
- `host/index.js` imports `remoteA/Widget`, then `remoteB/Page` after `?gap=<ms>`, and logs `DEADLOCK` if either is still pending after 5s.
- `server.js` serves on port 3000 and delays `remote-b/remoteEntry.js` by 1000ms.
- `debug-plugin.js` is a runtime plugin, added to all builds when `DEBUG=1`, that logs container init start/done (with `initScope` tokens) and shared loads per federation instance.

## Commands

```sh
npm install
npm start            # build + serve
DEBUG=1 npm start    # with debug-plugin logs in the browser console
```

`npm start` rebuilds, but a running server must be restarted after editing `server.js`. Stop it with `lsof -ti tcp:3000 | xargs kill`. With the server running, `npm run build` is enough to pick up config or source changes.

## Verifying

Load each URL as its own page and read `#log` after `gap + 5500` ms. Gaps from 0 to 900ms should log `DEADLOCK`, 1500 and 2000ms should resolve. Don't run several gaps in iframes of one page, the frames interfere and every frame reports a deadlock.

With Playwright, loop `page.goto` over the gaps in one page and collect `page.on('console')` output.

## Trying the candidate fix

Apply the diff from the README's "Candidate fix" section to both `node_modules/@module-federation/webpack-bundler-runtime/dist/initializeSharing.js` and `initializeSharing.cjs`, then rebuild. Every gap should resolve. Restore the original files with `npm ci`.
