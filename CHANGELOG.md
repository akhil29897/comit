# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Live (opt-in) data source via Baileys, behind the existing `DataSource` interface.
- Additional importers (Telegram, Signal, iMessage).
- Configurable scoring weights from the CLI.

## [0.1.0] - 2026-06-25

The first release.

### Added
- **Core engine** (pure, deterministic, zero runtime dependencies):
  - WhatsApp chat-export parser (iOS + Android, locale date order, multi-line, media, system lines).
  - `DataSource` interface + file/folder source.
  - Interaction score (recency, frequency, reciprocity, responsiveness, initiation).
  - Reply-debt detection (trailing-run analysis).
  - Work-life balance report (work/personal split, after-hours work, rhythm).
  - Momentum / trend detection (recent vs prior half of window).
  - Composed, ranked nudges.
- **CLI** with `report`, `scores`, `debts`, `nudges`, `balance`, `--json`, and a help screen.
- **Local web dashboard** (Bun server + dependency-free, offline front-end).
- **Synthetic demo fixtures** + a deterministic generator script.
- **Test suite** (parser, analytics, pipeline) on `bun:test`.
- **Docs**: architecture, scoring model, privacy, usage, roadmap.
- **Presentation** deck (reveal.js + exported `.pptx`).
