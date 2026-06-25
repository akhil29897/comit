import type {
  Conversation,
  InteractionScore,
  Message,
  ScoreBreakdown,
  ScoreGrade,
  ScoreWeights,
} from "../types.ts";
import { DAY, HOUR, MINUTE, clamp, median, round } from "../util.ts";

/**
 * Tunable constants for the interaction score. Exported so the docs and tests
 * can reference the exact same numbers (see docs/SCORING.md).
 */
export const SCORE_PARAMS = {
  /** Recency decay constant in days: recency = e^(-days / tau). */
  recencyTauDays: 14,
  /** Frequency half-saturation: messages/week that score 0.5. */
  freqHalfPerWeek: 7,
  /** Responsiveness decay in hours: e^(-medianReplyHours / tau). */
  responseTauHours: 6,
  /** Neutral score used when a component can't be computed. */
  neutral: 0.5,
  /** Gap that marks the start of a new conversation, in hours. */
  conversationGapHours: 6,
} as const;

const GRADE_CUTOFFS: { min: number; grade: ScoreGrade }[] = [
  { min: 70, grade: "thriving" },
  { min: 45, grade: "steady" },
  { min: 25, grade: "cooling" },
  { min: 0, grade: "fading" },
];

export function gradeFor(score: number): ScoreGrade {
  return (GRADE_CUTOFFS.find((c) => score >= c.min) as { grade: ScoreGrade }).grade;
}

/**
 * Compute the composite interaction score for one conversation.
 *
 * The score blends five signals, each normalized to 0–1, then weighted and
 * scaled to 0–100:
 *   recency        — how recently you last spoke
 *   frequency      — how often you talk (per week, in-window)
 *   reciprocity    — how balanced the volume is between you
 *   responsiveness — how fast you reply to them
 *   initiation     — how balanced "who starts" is
 */
export function interactionScore(
  conv: Conversation,
  referenceNow: Date,
  weights: ScoreWeights,
  windowDays: number,
): InteractionScore {
  const now = referenceNow.getTime();
  const windowStart = now - windowDays * DAY;
  const all = conv.messages;
  const windowed = all.filter((m) => m.ts >= windowStart && m.ts <= now);

  const breakdown = computeBreakdown(all, windowed, now, windowDays);
  const raw =
    weights.recency * breakdown.recency +
    weights.frequency * breakdown.frequency +
    weights.reciprocity * breakdown.reciprocity +
    weights.responsiveness * breakdown.responsiveness +
    weights.initiation * breakdown.initiation;
  const score = round(clamp(raw, 0, 1) * 100, 1);

  const sent = windowed.filter((m) => m.direction === "out").length;
  const received = windowed.length - sent;
  const lastTs = all.length ? (all.at(-1) as Message).ts : now;
  const replyMins = medianReplyMinutes(windowed);

  return {
    contact: conv.contact,
    category: conv.category,
    isGroup: conv.isGroup,
    score,
    grade: gradeFor(score),
    breakdown,
    stats: {
      total: windowed.length,
      sent,
      received,
      lastContactDays: round((now - lastTs) / DAY, 1),
      medianReplyMins: replyMins === null ? null : round(replyMins, 0),
    },
  };
}

function computeBreakdown(
  all: Message[],
  windowed: Message[],
  now: number,
  windowDays: number,
): ScoreBreakdown {
  // Recency: based on the most recent message overall.
  const lastTs = all.length ? (all.at(-1) as Message).ts : now;
  const daysSince = Math.max(0, (now - lastTs) / DAY);
  const recency = Math.exp(-daysSince / SCORE_PARAMS.recencyTauDays);

  // Frequency: in-window messages per week, saturating.
  const perWeek = (windowed.length / windowDays) * 7;
  const frequency = perWeek / (perWeek + SCORE_PARAMS.freqHalfPerWeek);

  // Reciprocity: balance of sent vs received volume.
  const sent = windowed.filter((m) => m.direction === "out").length;
  const received = windowed.length - sent;
  const denom = Math.max(sent, received);
  const reciprocity = denom === 0 ? 0 : Math.min(sent, received) / denom;

  // Responsiveness: how fast you reply to them.
  const replyMins = medianReplyMinutes(windowed);
  const responsiveness =
    replyMins === null
      ? SCORE_PARAMS.neutral
      : Math.exp(-(replyMins / 60) / SCORE_PARAMS.responseTauHours);

  // Initiation: balance of who opens conversations.
  const initiation = initiationBalance(windowed);

  return {
    recency: round(recency, 3),
    frequency: round(frequency, 3),
    reciprocity: round(reciprocity, 3),
    responsiveness: round(responsiveness, 3),
    initiation: round(initiation, 3),
  };
}

/**
 * Median minutes between *their* message and your *next* reply. A reply is the
 * first outbound message that follows one or more inbound messages.
 */
function medianReplyMinutes(messages: Message[]): number | null {
  const latencies: number[] = [];
  let pendingInbound: number | null = null; // ts of first unanswered inbound
  for (const m of messages) {
    if (m.direction === "in") {
      if (pendingInbound === null) pendingInbound = m.ts;
    } else {
      if (pendingInbound !== null) {
        latencies.push((m.ts - pendingInbound) / MINUTE);
        pendingInbound = null;
      }
    }
  }
  return median(latencies);
}

/** 1 = both sides start conversations equally; 0 = always one side. */
function initiationBalance(messages: Message[]): number {
  const gap = SCORE_PARAMS.conversationGapHours * HOUR;
  let mine = 0;
  let theirs = 0;
  let prevTs: number | null = null;
  for (const m of messages) {
    const isStart = prevTs === null || m.ts - prevTs > gap;
    if (isStart) {
      if (m.direction === "out") mine++;
      else theirs++;
    }
    prevTs = m.ts;
  }
  const total = mine + theirs;
  if (total === 0) return SCORE_PARAMS.neutral;
  return 1 - Math.abs(mine - theirs) / total;
}
