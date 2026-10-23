# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

ownfolio is a personal portfolio tracker: a Node/Express server backed by PostgreSQL and a React single-page app, written
in TypeScript and bundled with esbuild.

## Layout

- `src/server` – backend
  - `index.ts` – CLI entry point (`server`, `create-user`, `regenerate-attachment-derivations`) via `commander`
  - `api/` – RPC handlers, one module per domain (`portfolio.ts`, `account.ts`, …)
  - `database/` – one `Database*` class per table plus `index.ts`, which owns the connection and migrations
  - `balance/`, `reports/`, `quotes/`, `csv/`, `pdf/` – domain logic, quote providers, imports, PDF handling and
    broker statement parsers (`pdf/parse/<broker>`)
  - `config.ts` – configuration from environment variables
- `src/shared` – code used by both server and web
  - `models/` – zod schemas and types for domain entities
  - `api/` – RPC call definitions (input/output schemas), combined in `api/index.ts`
- `src/web` – React frontend (`views/`, `components/`, `hooks/`); `api.ts` exposes the typed RPC client
- `test/` – test helpers and the screenshot generator
- `pages/` – GitHub Pages site (changelog, screenshots)
- `build.js` – esbuild build for server and web into `dist/`

## Commands

```bash
npm ci                # install (requires `npm login --registry https://npm.pkg.github.com` for @ownfolio/*)
npm run start:dev     # dev server with reload (needs postgres: `docker compose up -d postgres`)
npm run build         # production build into dist/
npm run lint          # tsc --noEmit, prettier --check, eslint
npm run lint:fix      # prettier --write and eslint --fix
npm test -- --run     # vitest, single run
npm test -- --run src/server/balance   # run a subset
npm run verify        # commit lint + lint:fix + lint + tests, what to run before committing
```

Tests for the database layer use testcontainers (`postgres:15`) and PDF tests run tools inside a Docker image, so
**Docker must be running** for the full test suite. If it is not, those tests fail with Docker connection errors that
are unrelated to your change.

## Conventions

- Formatting is Prettier (`.prettierrc`: 120 columns, no semicolons, single quotes, trailing commas `es5`, no parens
  around single arrow params). Imports are sorted by `eslint-plugin-simple-import-sort`. Run `npm run lint:fix` rather
  than formatting by hand.
- Dependencies in `package.json` are pinned to exact versions; keep it that way.
- Tests live next to the code as `*.test.ts` (benchmarks as `*.bench.ts`). Database tests wrap their body in
  `databaseTest(async database => …)` from `src/server/database/databaseTest.ts`. External HTTP responses are mocked
  with recorded `*.test.mock.json` fixtures.
- Monetary and quantity values use `bignumber.js` (`BigNumber`), never plain `number`. Postgres `numeric` columns are
  mapped to `BigNumber`; dates and timestamps are kept as ISO strings.
- Styling uses Linaria (`css` from `@linaria/core`) with CSS custom properties such as `var(--color-neutral-lite)`,
  defined next to the component and combined with `clsx`.

## Common tasks

### Adding or changing an API call

1. Define or adjust the zod schema in `src/shared/models/`.
2. Add the call definition with `createRpcCallDefinition(input, output)` in `src/shared/api/<domain>.ts` and make sure
   it is spread into `rpcV1Definition` in `src/shared/api/index.ts`.
3. Implement the handler in `src/server/api/<domain>.ts`. Every handler must check `ctx.user` (throw
   `RpcError.unauthorized()`) and verify that loaded entities belong to `ctx.user.id`.
4. Call it from the frontend through `rpcClient` in `src/web/api.ts`.

### Changing the database schema

Migrations are methods on the table classes in `src/server/database/`, registered in order in `Database.init()` via
`this.migrate('<table>.<name>', sql => …)`. Each id runs exactly once. **Never edit or reorder an existing migration**;
add a new method and append a new `migrate` call at the end.

## Commits

Commit messages follow Conventional Commits (enforced by commitlint), e.g. `feat: …`, `fix: …`, `build: update
dependencies`. CI runs commit lint, `npm run lint`, `npm test -- --run` and `npm run build` on every push and pull
request to `main`.
