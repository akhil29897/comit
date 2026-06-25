# Usage & configuration

## Install

[Bun](https://bun.sh) ≥ 1.1 is the only requirement. Bun runs the TypeScript directly — there's no build step.

```bash
git clone https://github.com/akhil29897/comit.git
cd comit
```

(`bun install` is optional — it only fetches dev-time TypeScript types so you can run `bun run typecheck`.)

## Export a chat from WhatsApp

On your phone:

- **iOS:** open a chat → tap the contact/group name → **Export Chat** → **Without Media**.
- **Android:** open a chat → **⋮** → **More** → **Export chat** → **Without media**.

You'll get a `.txt` file (often named `WhatsApp Chat with <Name>.txt`). Both platform formats are parsed automatically, including 12h/24h clocks and DD/MM vs MM/DD date order.

Put one or more exports in a folder:

```
exports/
├── WhatsApp Chat with Riya.txt
├── WhatsApp Chat with Mom.txt
└── WhatsApp Chat with Work Group.txt
```

## Run it

```bash
# Full report
bun run comit report ./exports --me "Your Name"

# Individual views
bun run comit scores  ./exports --me "Your Name"
bun run comit debts   ./exports --me "Your Name"
bun run comit nudges  ./exports --me "Your Name"
bun run comit balance ./exports --me "Your Name"

# Machine-readable
bun run comit report ./exports --me "Your Name" --json > report.json
```

> `--me` must match **your** name exactly as it appears in the export (the sender label on your messages). It's how `comit` tells "in" from "out".

### Web dashboard

```bash
COMIT_SOURCE=./exports COMIT_ME="Your Name" bun run web
# → http://localhost:4317
```

## CLI options

| Option | Default | Description |
|---|---|---|
| `--me <name>` | — | Your name as it appears in the chat (**required** unless set in config) |
| `--config <file>` | — | Path to a JSON config (see below) |
| `--window <days>` | `90` | Analysis window |
| `--now <mode>` | `latest` | Reference time: `latest`, `system`, or an ISO date |
| `--top <n>` | `12` | How many contacts to list |
| `--month-first` | off | Parse dates as MM/DD instead of DD/MM |
| `--json` | off | Emit raw JSON |
| `--no-color` | off | Disable ANSI color |

## Configuration file

A config file lets you categorize contacts, set working hours, and tune the window. Pass it with `--config`.

```jsonc
{
  "me": "Akhil",
  "windowDays": 90,
  "now": "latest",                 // "latest" | "system" | "2026-06-01"
  "defaultCategory": "unknown",    // category for unlisted contacts
  "workHours": {
    "start": 9,                    // 24h local time
    "end": 18,
    "days": [1, 2, 3, 4, 5]        // 0=Sun … 6=Sat
  },
  "contacts": [
    { "name": "Riya",  "category": "personal", "tags": ["close-friend"] },
    { "name": "Vinay", "category": "work",     "alias": "Vinay (SAHA)" },
    { "name": "Amma",  "category": "personal", "tags": ["family"] }
  ]
}
```

| Field | Meaning |
|---|---|
| `me` | Your sender name (CLI `--me` overrides this) |
| `windowDays` | Analysis window in days |
| `now` | How to anchor "now". `latest` is deterministic; `system` uses the real clock |
| `defaultCategory` | Applied to any contact not listed in `contacts` |
| `workHours` | Used for after-hours work detection |
| `contacts[].name` | Match key — the contact's name in the export |
| `contacts[].category` | `work` / `personal` / `unknown` |
| `contacts[].alias` | Friendlier display name |
| `contacts[].tags` | Free-form labels |

A working example ships at [`fixtures/comit.config.json`](../fixtures/comit.config.json).

## Programmatic use

The engine is a normal module — import it into your own tool:

```ts
import { WhatsAppExportSource, analyzeSource, buildConfig } from "comit/src/core";

const config = buildConfig({ me: "Akhil", contacts: [{ name: "Riya", category: "personal" }] });
const source = new WhatsAppExportSource("./exports", config.me);
const report = await analyzeSource(source, config);

console.log(report.nudges);
```
