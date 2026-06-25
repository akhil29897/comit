import type {
  BalanceReport,
  Config,
  InteractionScore,
  Nudge,
  ReplyDebt,
  Trend,
} from "../types.ts";
import { DAY, HOUR, clamp, round } from "../util.ts";

export const NUDGE_PARAMS = {
  /** Don't nag about a reply until it's been owed at least this long. */
  replyDebtMinHours: 12,
  /** After-hours work pings from one contact above this earns a boundary nudge. */
  afterHoursContactMin: 4,
  /** Median reply latency (hours) above which responsiveness is flagged. */
  slowReplyHours: 12,
  /** Cap on how many nudges to surface. */
  maxNudges: 12,
} as const;

interface NudgeInputs {
  scores: InteractionScore[];
  debts: ReplyDebt[];
  trends: Trend[];
  balance: BalanceReport;
  config: Config;
  referenceNow: Date;
}

/**
 * Turn the raw analytics into a prioritized list of plain-language nudges.
 * Each rule is intentionally small and independent so it's easy to read, test,
 * and extend.
 */
export function buildNudges(inputs: NudgeInputs): Nudge[] {
  const nudges: Nudge[] = [
    ...replyDebtNudges(inputs.debts),
    ...driftingNudges(inputs.trends),
    ...boundaryNudges(inputs.balance),
    ...risingWorkNudges(inputs.trends),
    ...responsivenessNudges(inputs.scores),
  ];
  return nudges
    .sort((a, b) => b.priority - a.priority)
    .slice(0, NUDGE_PARAMS.maxNudges);
}

function replyDebtNudges(debts: ReplyDebt[]): Nudge[] {
  return debts
    .filter(
      (d) =>
        !d.isGroup &&
        d.owedBy === "me" &&
        d.waitingMs >= NUDGE_PARAMS.replyDebtMinHours * HOUR,
    )
    .map((d) => {
      const days = d.waitingMs / DAY;
      const personalBump = d.category === "personal" ? 5 : 0;
      return {
        kind: "reply-debt" as const,
        contact: d.contact,
        category: d.category,
        priority: clamp(50 + days * 8 + personalBump, 0, 98),
        message: `You owe ${d.contact} a reply — waiting ${d.waitingHuman}. Last: “${d.lastMessageText}”`,
      };
    });
}

function driftingNudges(trends: Trend[]): Nudge[] {
  return trends
    .filter(
      (t) =>
        !t.isGroup &&
        t.category !== "work" &&
        t.direction === "falling" &&
        t.priorPerWeek >= 1,
    )
    .map((t) => ({
      kind: "drifting" as const,
      contact: t.contact,
      category: t.category,
      priority: clamp(35 + Math.min(t.priorPerWeek, 10) * 3, 0, 78),
      message:
        t.recentPerWeek === 0
          ? `You've gone quiet with ${t.contact} — used to be ~${t.priorPerWeek}/week. Reach out?`
          : `${t.contact} is cooling off: ~${t.priorPerWeek}/week → ~${t.recentPerWeek}/week. Reach out?`,
    }));
}

function boundaryNudges(balance: BalanceReport): Nudge[] {
  return balance.afterHoursWork.byContact
    .filter((c) => c.count >= NUDGE_PARAMS.afterHoursContactMin)
    .map((c) => ({
      kind: "boundary" as const,
      contact: c.contact,
      category: "work" as const,
      priority: clamp(40 + c.count * 3, 0, 88),
      message: `${c.contact} (work) reached you after hours ${c.count}× recently. Consider muting or setting expectations.`,
    }));
}

function risingWorkNudges(trends: Trend[]): Nudge[] {
  return trends
    .filter((t) => t.category === "work" && t.direction === "rising" && t.recentPerWeek >= 3)
    .map((t) => ({
      kind: "boundary" as const,
      contact: t.contact,
      category: t.category,
      priority: clamp(30 + t.changePct * 8, 0, 72),
      message: `Work chatter with ${t.contact} is climbing (~${t.priorPerWeek}/week → ~${t.recentPerWeek}/week). Protect your off-hours.`,
    }));
}

function responsivenessNudges(scores: InteractionScore[]): Nudge[] {
  return scores
    .filter(
      (s) =>
        !s.isGroup &&
        s.stats.medianReplyMins !== null &&
        s.stats.medianReplyMins / 60 >= NUDGE_PARAMS.slowReplyHours &&
        s.category !== "work",
    )
    .map((s) => {
      const hours = round((s.stats.medianReplyMins as number) / 60, 1);
      return {
        kind: "responsiveness" as const,
        contact: s.contact,
        category: s.category,
        priority: clamp(25 + (hours - NUDGE_PARAMS.slowReplyHours) * 1.5, 0, 60),
        message: `Your replies to ${s.contact} take ~${hours}h on average. If they matter, tighten that up.`,
      };
    });
}
