# ts-security-check

Security checks for **TypeScript and JavaScript** projects, **without AI**: the TypeScript compiler's own parser reads
each `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` and `.cjs` file. Each check is one file. Nothing is changed and nothing is
sent anywhere (only `npm audit` uses the network). A finding at or above `--fail-on` (default `medium`) exits 1, so it
gates CI or a merge.

## Install and run

```bash
npm i -D github:olgunozoktas/ts-security-check       # from GitHub (npm publication comes later)
npx ts-security-check                                 # the project in this folder
npx ts-security-check --fail-on high ./packages/api   # fail only on high
npx ts-security-check --json --only sql-built-from-strings,path-from-request
npx ts-security-check --tests                         # also read *.test.* and *.spec.* files
```

Exit 0: nothing at or above `--fail-on`. Exit 1: a finding. Exit 2: a wrong flag, or a folder with no `package.json`,
`tsconfig.json` or `jsconfig.json`.

**Not read:** `node_modules`, `dist`, `build`, `out`, `coverage`, `.next`, `.nuxt`, `.output`, `vendor`, `archive`, hidden folders,
`.d.ts` files, files over 1 MB, and built files (a `.min.js`, a line over 2,000 characters, or a bundler's runtime
such as webpack's). The summary line counts the skipped files.

## The checks

| Check | Severity | What it finds |
|---|---|---|
| `cookie-flags` | medium / low | `res.cookie(…)` without `httpOnly` or `secure` (a deleted cookie is fine) |
| `cors-wildcard` | low / high | CORS for every origin (`*` or `origin: true`); high when the file also allows credentials |
| `eval-with-a-variable` | high | `eval`, `new Function` or a string `setTimeout` with code built from a variable |
| `html-from-a-variable` | medium / low | `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` or `dangerouslySetInnerHTML` of a value that is not escaped. A call to a function named `esc…`, `escape…`, `sanitize…`, `purify…` or `encode…`, a number and a boolean count as escaped. `JSON.stringify` in a script is low |
| `jwt-decode-without-verify` | medium | `jwt.decode` or `jwtDecode`: the signature is not checked |
| `npm-audit` | the advisory's | `npm audit --omit=dev` on `package-lock.json`. It fails closed: an audit that does not answer is medium, because nothing was checked |
| `open-redirect` | medium | `redirect(…)` to an address from request data |
| `path-from-request` | high | a file path from request data (`req.params`, `req.query`, `ctx.query`, `searchParams.get` …) |
| `secrets-in-code` | high | a live secret in a string, also one joined from pieces (Stripe, AWS, GitHub, Slack, npm tokens, private keys). The finding never quotes it |
| `shell-with-a-variable` | high | `child_process` `exec` or `execSync` with a command line from a variable (a RegExp's `.exec` is not reported) |
| `sql-built-from-strings` | high | SQL in `query`, `execute`, `raw`, `$queryRawUnsafe` … built with `${…}` or `+`. A tagged template (`sql\`…\``) binds its values and is fine |
| `tls-without-verification` | high | `rejectUnauthorized: false`, or `NODE_TLS_REJECT_UNAUTHORIZED = "0"` |
| `weak-hash-for-passwords` | high | `createHash('md5' | 'sha1')` in a file that handles passwords |
| `weak-random-for-secrets` | high | `Math.random()` for a value named like a token, a secret, a code or a salt |

A finding is a **candidate**: the check sees the shape, not where the value came from. A line that the author checked
carries a marker in a **real comment** (a marker inside a string counts for nothing):

```ts
el.innerHTML = renderTrusted(view); // ts-security-check:ignore the view is built from our own constants
```

`// eslint-disable-line security/…` and `// eslint-disable-next-line security/…` count too.

## Add a check

A file in `src/checks/` whose default export is `{ name, run(project) }` (`run` answers findings and changes nothing),
a `test/fixtures/<check>/bad/` and `good/` folder, and its line in `BAD` in `test/checks.test.js`. `npm test` fails
for a check without fixtures.

## License

MIT
