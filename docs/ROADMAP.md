# Roadmap

`comit` shipped as a focused, safe, offline tool. Here's where it can go. None of this is a promise — it's an invitation. PRs welcome.

## Near term

- [ ] **Configurable scoring weights via the CLI** (`--weights recency=0.4,...`).
- [ ] **Weekly digest mode** — a single "here's your week in relationships" summary, optionally written to a Markdown file.
- [ ] **Per-contact deep-dive view** in the dashboard (click a ring → timeline, latency histogram, hour heatmap).
- [ ] **i18n for date formats** — more locale date orders and month names in the parser.

## More importers

The whole point of the `DataSource` interface is that new sources are cheap. Each of these is "a parser + a thin file wrapper," with **zero** changes to the analytics:

- [ ] **Telegram** JSON export
- [ ] **Signal** export
- [ ] **iMessage** (from the local `chat.db` on macOS)
- [ ] **Instagram / Messenger** data download

## The live data source (advanced, opt-in)

The most-requested capability will be **real-time** tracking — true "you've been owed a reply for 2 hours" nudges, without re-exporting.

This is feasible via [Baileys](https://github.com/WhiskeySockets/Baileys), an open-source library that links as a WhatsApp **companion device**. It would implement the existing `DataSource` interface:

```ts
class BaileysLiveSource implements DataSource {
  readonly name = "whatsapp-live";
  async load(): Promise<RawConversation[]> { /* … */ }
}
```

…and plug straight into the pipeline. **But it will only ever ship as an explicitly opt-in, clearly-labeled module**, because:

- It is **unofficial** and against WhatsApp's Terms of Service.
- It carries a small but real **account-ban risk**.
- A privacy-first project should never make that choice *for* a user, or as a default.

So the design intent is: keep the core safe and export-based; offer the live adapter as a documented, opt-in fork/plugin for people who understand the trade-off. The architecture is already ready for it — that's the point of the seam.

## Won't do

- ❌ A hosted/cloud version. comit is local-only by design.
- ❌ Telemetry or analytics of any kind.
- ❌ Scoring or ranking *other people* for any purpose beyond your own reflection.

See [PRIVACY.md](PRIVACY.md) for the principles behind these.
