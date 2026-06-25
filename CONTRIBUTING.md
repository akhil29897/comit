# Contributing to comit

Thanks for considering a contribution! `comit` is built to be forked, read, and extended. This guide gets you productive fast.

## Ground rules

- **Privacy is non-negotiable.** No contribution may add a network request, telemetry, or anything that writes a user's messages to disk. See [docs/PRIVACY.md](docs/PRIVACY.md).
- **Keep the core pure.** Nothing under `src/core/analytics` may read the clock, the filesystem, or the network. Time is injected; I/O lives in `src/core/sources` and the interfaces.
- **Zero runtime dependencies.** Dev-only TypeScript tooling is fine; runtime packages need a very good reason.

## Getting started

```bash
git clone https://github.com/takhil/comit.git
cd comit
bun install        # dev types only
bun test           # should be green
bun run demo       # see it work
```

## Project layout

See the [Architecture guide](docs/ARCHITECTURE.md). The short version:

- `src/core/` — the pure engine (types, normalize, sources, analytics, pipeline)
- `src/cli/` — terminal interface
- `src/web/` — local dashboard
- `test/` — `bun:test` suite
- `fixtures/` + `scripts/` — synthetic demo data and its generator

## Workflow

1. Fork and branch: `git checkout -b feature/my-thing`.
2. Make your change. Add or update tests.
3. Keep it green:
   ```bash
   bun test
   bun run typecheck
   ```
4. If you changed demo behavior, regenerate fixtures deterministically:
   ```bash
   bun run scripts/generate-fixtures.ts
   ```
5. Open a PR with a clear description of the *why*.

## Good first issues

- **A new importer** (Telegram, Signal, iMessage). Implement the [`DataSource`](src/core/sources/source.ts) interface — the analytics need no changes.
- **A new nudge rule** in [`src/core/analytics/nudges.ts`](src/core/analytics/nudges.ts). Add a test for it.
- **More locale date formats** in the parser.
- **Dashboard polish** — a per-contact detail view, keyboard nav, accessibility.

## Style

- TypeScript, `strict` mode. Prefer small pure functions.
- Comment the *why*, not the *what*.
- Match the surrounding code's naming and density.

## Adding a data source (mini-tutorial)

```ts
import type { DataSource, RawConversation } from "../sources/source.ts";

export class TelegramSource implements DataSource {
  readonly name = "telegram-export";
  constructor(private path: string, private me: string) {}

  load(): RawConversation[] {
    // 1. read the export (this is the only impure part)
    // 2. map it to RawConversation[] with RawMessage[] (kind: "message" | "system")
    // 3. return it — the pipeline handles the rest
  }
}
```

That's it. Normalization, scoring, debts, balance, trends, and nudges all come for free.

## Code of Conduct

By participating you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).
