# Architecture

`comit` is intentionally small and layered. The guiding rule: **the analytics never touch the outside world.** Everything that reads files, the clock, or the network lives at the edges, so the interesting logic stays pure and exhaustively testable.

```
            ┌─────────────────────────────────────────────────────────┐
            │                        Interfaces                        │
            │   src/cli  (terminal)          src/web  (Bun + browser)  │
            └───────────────┬─────────────────────────┬───────────────┘
                            │                          │
                            ▼                          ▼
            ┌─────────────────────────────────────────────────────────┐
            │                  src/core/pipeline.ts                    │
            │     analyze(raw, config) → Report   (pure, deterministic)│
            └───────────────┬─────────────────────────┬───────────────┘
                  normalize │                          │ analytics
                            ▼                          ▼
        ┌───────────────────────────┐    ┌────────────────────────────────┐
        │  src/core/normalize.ts    │    │  src/core/analytics/*           │
        │  raw → categorized,       │    │  interactionScore · replyDebt   │
        │  direction-tagged msgs    │    │  balance · trends · nudges      │
        └─────────────┬─────────────┘    └────────────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │  src/core/sources/*        │   ◀── the ONLY layer that does I/O
        │  DataSource interface      │
        │  + WhatsApp export parser  │
        └───────────────────────────┘
```

## Layers

### 1. Data sources (`src/core/sources`)
A `DataSource` produces `RawConversation[]`. The seam exists so the rest of the system doesn't care *where* messages come from.

- [`whatsapp-export.ts`](../src/core/sources/whatsapp-export.ts) — a **pure** parser: text in, structured messages out. Handles iOS/Android layouts, locale date order, multi-line messages, media placeholders, and system notices.
- [`whatsapp-file-source.ts`](../src/core/sources/whatsapp-file-source.ts) — the thin I/O wrapper that reads files/folders and feeds the parser.

> **Why this matters:** a live source (e.g. a [Baileys](https://github.com/WhiskeySockets/Baileys) companion-device adapter) would implement the same `DataSource` interface and plug in with **no changes to the analytics**. See [ROADMAP.md](ROADMAP.md).

### 2. Normalization (`src/core/normalize.ts`)
Turns raw conversations into the analytics' input:
- drops system lines,
- tags each message `in`/`out` relative to you,
- pre-computes local hour + weekday (so analytics never read a clock),
- attaches each contact's `work`/`personal` category and tags from config.

It also resolves the **reference "now"** — `latest` (newest message, the deterministic default), `system` (real clock, passed in by the caller), or a fixed ISO date.

### 3. Analytics (`src/core/analytics`)
Five small, independent modules, each a pure function over normalized conversations:

| Module | Output |
|---|---|
| `interactionScore.ts` | composite 0–100 score + component breakdown + stats |
| `replyDebt.ts` | who owes whom on the trailing run of each thread |
| `balance.ts` | work/personal split, after-hours work, weekday/hour rhythm |
| `trends.ts` | per-contact momentum (recent half vs prior half) |
| `nudges.ts` | a ranked, plain-language to-do list composed from the above |

The scoring model is documented in [SCORING.md](SCORING.md).

### 4. Pipeline (`src/core/pipeline.ts`)
Orchestrates: `normalize → score → debt → balance → trends → nudges`, returning a single `Report`. Pure and deterministic given the same inputs — which is exactly why the tests can assert on it.

### 5. Interfaces
- **CLI** (`src/cli`) — a zero-dependency argument parser and an ANSI renderer.
- **Web** (`src/web`) — a tiny `Bun.serve` server exposing `/api/report` (the same pipeline) and a static, dependency-free dashboard.

Both interfaces are *thin*. They format a `Report`; they don't compute anything.

## Design principles

1. **Purity at the core.** No module under `src/core/analytics` imports `node:fs`, reads `Date.now()`, or makes a request. Time is injected. This is what makes the suite fast and trustworthy.
2. **One seam for I/O.** Sources are the only place messages enter the system.
3. **Zero runtime dependencies.** Smaller supply chain, easier audit, nothing to break. Dev-only deps are just TypeScript types.
4. **Composable analytics.** Each signal is independent and individually testable; nudges are the composition layer.
5. **Determinism.** Same export + same config ⇒ identical report. The demo always looks the same.

## Testing strategy

- **Parser tests** ([`test/whatsapp-export.test.ts`](../test/whatsapp-export.test.ts)) cover both platforms, date-order inference, multi-line folding, media, and groups.
- **Analytics tests** ([`test/analytics.test.ts`](../test/analytics.test.ts)) construct messages directly and assert each signal in isolation.
- **Pipeline tests** ([`test/pipeline.test.ts`](../test/pipeline.test.ts)) run the whole thing over the synthetic fixtures and assert the end-to-end narrative.

```bash
bun test
```
