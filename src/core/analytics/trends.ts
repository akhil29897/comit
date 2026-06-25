import type { Config, Conversation, Trend, TrendDirection } from "../types.ts";
import { DAY, clamp, round } from "../util.ts";

export const TREND_PARAMS = {
  /** |change| above this counts as rising/falling rather than steady. */
  changeThreshold: 0.25,
  /** Minimum combined messages before a trend is trusted (noise guard). */
  minMessages: 4,
} as const;

/**
 * Per-contact momentum: compare the most recent half of the window against the
 * prior half. Surfaces relationships that are heating up (maybe set a boundary)
 * or cooling down (maybe reach out).
 */
export function trends(
  conversations: Conversation[],
  config: Config,
  referenceNow: Date,
): Trend[] {
  const now = referenceNow.getTime();
  const halfMs = (config.windowDays / 2) * DAY;
  const midpoint = now - halfMs;
  const windowStart = now - config.windowDays * DAY;
  const halfWeeks = config.windowDays / 2 / 7;

  const out: Trend[] = [];
  for (const conv of conversations) {
    let recent = 0;
    let prior = 0;
    for (const m of conv.messages) {
      if (m.ts < windowStart || m.ts > now) continue;
      if (m.ts >= midpoint) recent++;
      else prior++;
    }
    if (recent + prior < TREND_PARAMS.minMessages) continue;

    const recentPerWeek = recent / halfWeeks;
    const priorPerWeek = prior / halfWeeks;
    const changePct = computeChange(recent, prior);

    out.push({
      contact: conv.contact,
      category: conv.category,
      isGroup: conv.isGroup,
      recentPerWeek: round(recentPerWeek, 2),
      priorPerWeek: round(priorPerWeek, 2),
      changePct: round(changePct, 2),
      direction: directionFor(changePct),
    });
  }
  return out.sort((a, b) => b.changePct - a.changePct);
}

function computeChange(recent: number, prior: number): number {
  if (prior === 0) return recent > 0 ? 1 : 0; // new / revived contact
  if (recent === 0) return -1; // gone quiet
  return clamp((recent - prior) / prior, -1, 5);
}

function directionFor(changePct: number): TrendDirection {
  if (changePct > TREND_PARAMS.changeThreshold) return "rising";
  if (changePct < -TREND_PARAMS.changeThreshold) return "falling";
  return "steady";
}
