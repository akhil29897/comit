# The scoring model

`comit`'s numbers are deliberately **transparent** — no black boxes. This page documents exactly how every score, debt, trend, and nudge is computed. The constants here live in code as `SCORE_PARAMS`, `TREND_PARAMS`, and `NUDGE_PARAMS` and can be tuned.

All analysis happens over a **window** (default **90 days**) ending at the reference "now".

---

## Interaction Score (0–100)

A composite of five signals, each normalized to `0..1`, then weighted and scaled to 0–100.

```
score = 100 × ( 0.30·recency + 0.25·frequency + 0.20·reciprocity
                + 0.15·responsiveness + 0.10·initiation )
```

| Signal | Weight | Definition |
|---|---:|---|
| **recency** | 0.30 | `e^(−daysSinceLastMessage / 14)` — a 14-day decay. Today ≈ 1.0; two weeks ≈ 0.37; a month ≈ 0.12. |
| **frequency** | 0.25 | `perWeek / (perWeek + 7)` where `perWeek` is in-window messages per week. 7/wk ⇒ 0.5; saturating, so it never runs away. |
| **reciprocity** | 0.20 | `min(sent, received) / max(sent, received)`. Perfectly mutual ⇒ 1; one-sided ⇒ → 0. |
| **responsiveness** | 0.15 | `e^(−medianReplyHours / 6)`. Median time between *their* message and your *next* reply. Fast replies score high. Neutral `0.5` if you've never replied. |
| **initiation** | 0.10 | `1 − |yourStarts − theirStarts| / totalStarts`. A "start" opens a conversation after a ≥ 6h gap. Balanced ⇒ 1. |

### Grades

| Grade | Score |
|---|---|
| 🟢 **thriving** | ≥ 70 |
| 🔵 **steady** | 45–69 |
| 🟡 **cooling** | 25–44 |
| 🔴 **fading** | < 25 |

> **Note:** the interaction score measures **connection strength**, not whether a relationship is *good for you*. A high-volume, after-hours work contact can score "thriving" — that's what the **balance** and **nudge** layers are for.

---

## Reply Debt

For each thread, `comit` looks at the **trailing run** — the unbroken streak of same-direction messages at the end.

- If that run is **inbound**, *you owe them* (`owedBy: "me"`).
- If it's **outbound**, *you're waiting on them* (`owedBy: "them"`).

The **wait** is measured from the **first** message of that run — so three quick texts from a friend three days ago reads as *"3 days"*, not the gap since their latest line. Groups are tracked but excluded from "you owe a reply" nudges.

---

## Work-Life Balance

Over the window, every message is tagged `work` / `personal` / `unknown` from your config.

- **work share** = `work / (work + personal)` (unknown excluded).
- **after-hours work** = work messages **outside** your working hours. Default working hours are **09:00–18:00, Mon–Fri**; anything else (evenings, weekends) counts as after-hours.
- **busiest hour** and a **per-weekday** histogram round out the rhythm.
- **late pingers** ranks the contacts responsible for the most after-hours work messages.

---

## Momentum (Trends)

The window is split in half. For each contact:

```
recentPerWeek  = messages in the recent half / weeks
priorPerWeek   = messages in the prior half  / weeks
changePct      = (recent − prior) / prior         (clamped to [−1, +5])
```

| Direction | Rule |
|---|---|
| ▲ **rising** | `changePct > +0.25` |
| ▼ **falling** | `changePct < −0.25` |
| **steady** | otherwise |

A contact with fewer than **4 combined** messages is ignored (noise guard). New contacts (`prior = 0`) read as rising; gone-quiet ones (`recent = 0`) as falling.

---

## Nudges

Nudges compose the signals above into a ranked to-do list. Each rule is small and independent:

| Nudge | Fires when | Priority grows with |
|---|---|---|
| ↩ **reply-debt** | you owe a non-group reply ≥ 12h old | how long it's been owed (personal gets a small bump) |
| ≀ **drifting** | a non-work contact is *falling* and used to be ≥ 1/wk | how active they used to be |
| ⚠ **boundary** (after-hours) | a work contact pinged you after hours ≥ 4× | the count |
| ⚠ **boundary** (rising work) | a work contact's cadence is *rising* and now ≥ 3/wk | the increase |
| ⏱ **responsiveness** | your median reply to a non-work contact ≥ 12h | how slow |

Nudges are sorted by priority and capped at **12**. Tune any of this in [`src/core/analytics/nudges.ts`](../src/core/analytics/nudges.ts).

---

## Tuning

Every constant above is exported and overridable:

- score weights → pass `weights` to `analyze()`
- window / working hours / categories → the config object (see [USAGE.md](USAGE.md))
- decay constants, thresholds → `SCORE_PARAMS`, `TREND_PARAMS`, `NUDGE_PARAMS`

Because the engine is pure, you can change a constant and re-run `bun test` to see exactly what moves.
