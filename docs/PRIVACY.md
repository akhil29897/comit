# Privacy

`comit` analyzes some of the most personal data you have — your private conversations. So privacy isn't a feature here; it's the architecture.

## The promises

1. **It runs entirely on your machine.** There is no `comit` server, account, or cloud. The "web dashboard" is a local server bound to `localhost`.
2. **It makes no network requests.** Not for analytics, not for crash reports, not for fonts or charts. The dashboard ships its own CSS and renders charts with hand-written SVG. You can run `comit` on an airplane, or with your network cable unplugged, and nothing changes.
3. **It only reads.** `comit` reads the export files you explicitly point it at. It never writes your messages anywhere — not to disk, not to a database, not to a log.
4. **Your data is git-ignored by default.** The `.gitignore` blocks `exports/`, `data/`, `my-chats/`, `*.whatsapp.txt`, and `*.comit.json`, so you can't accidentally commit a real conversation. Only the **synthetic** fixtures are tracked.
5. **A tiny, auditable supply chain.** `comit` has **zero runtime dependencies**. The only dev-time packages are TypeScript and its type definitions. There's no transitive web of code that could exfiltrate anything.

## How to verify it yourself

Don't take our word for it:

```bash
# 1. There are no runtime dependencies to hide anything.
cat package.json            # "dependencies" is absent; only devDependencies

# 2. The code makes no outbound calls. These should return nothing:
grep -rn "fetch(" src/core src/cli
grep -rni "http" src/core   # only comments / the localhost dashboard note

# 3. Run it offline. Turn off your wi-fi and:
bun run demo
```

The only `fetch` in the whole project is in the **browser** dashboard calling **your own** local server (`/api/report`).

## What leaves your machine

Nothing. To be exhaustive:

| Thing | Leaves your device? |
|---|---|
| Your messages | ❌ never |
| Contact names | ❌ never |
| Scores / reports | ❌ never (printed to your terminal / shown in your browser) |
| Usage analytics | ❌ there are none |

## Using it responsibly

`comit` is a tool for **self-reflection about your own communication**. A few principles we'd ask you to keep:

- Analyze **your own** exports. Other people in your chats didn't opt in to being scored.
- Keep reports to yourself. The point is personal balance, not surveillance of others.
- If you fork `comit` to add a live data source (see [ROADMAP.md](ROADMAP.md)), keep it **opt-in and clearly labeled**, and respect the terms of any platform you connect to.

## Reporting a concern

Found something that doesn't match these promises? That's a bug, and a serious one. Please open an issue or see [SECURITY.md](../SECURITY.md).
