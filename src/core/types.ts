/**
 * comit — core domain types.
 *
 * Everything in `src/core` is pure: it takes normalized data in and returns
 * plain objects out. No file system, no network, no clock reads (the reference
 * "now" is passed in explicitly). That makes the analytics deterministic and
 * trivial to unit-test — see `test/`.
 */

/** How a contact relates to your work-life boundary. */
export type Category = "work" | "personal" | "unknown";

/** Direction of a message relative to *you* (the account owner). */
export type Direction = "in" | "out";

/**
 * A single normalized message. Adapters (e.g. the WhatsApp export parser)
 * are responsible for producing these; the analytics never see raw text lines.
 */
export interface Message {
  /** When the message was sent, in the export's local time. */
  timestamp: Date;
  /** Epoch milliseconds — convenience mirror of `timestamp` for math. */
  ts: number;
  /** Sender name exactly as it appears in the export. */
  sender: string;
  /** "out" if you sent it, "in" if the other party did. */
  direction: Direction;
  /** Message body. Media placeholders are normalized to "" with isMedia=true. */
  text: string;
  /** True when the original line was a media placeholder (image/video/etc.). */
  isMedia: boolean;
  /** Local hour, 0–23. Pre-computed so analytics stay clock-free. */
  hour: number;
  /** Day of week, 0=Sunday … 6=Saturday. */
  weekday: number;
}

/**
 * Raw, pre-normalization message straight out of an adapter. System lines
 * (encryption notices, "X added Y", etc.) come through as kind "system" and are
 * dropped before analytics.
 */
export interface RawMessage {
  timestamp: Date;
  sender: string;
  text: string;
  kind: "message" | "system";
  isMedia: boolean;
}

/** A 1:1 thread (or a group) with its messages, already categorized. */
export interface Conversation {
  /** The other party's name for 1:1 chats, or the group title for groups. */
  contact: string;
  isGroup: boolean;
  category: Category;
  tags: string[];
  /** Chronological, system lines excluded. */
  messages: Message[];
}

/** Per-contact configuration the user supplies (optional). */
export interface ContactConfig {
  /** Name as it appears in the export (the match key). */
  name: string;
  category?: Category;
  /** Friendlier display name. */
  alias?: string;
  /** Free-form tags: "family", "manager", "client", … */
  tags?: string[];
}

/** Top-level run configuration. */
export interface Config {
  /** The account owner's name, exactly as it appears in the export. */
  me: string;
  contacts: ContactConfig[];
  /** Working window used for after-hours work detection (24h local time). */
  workHours: { start: number; end: number; days: number[] };
  /** Category applied to any contact not listed in `contacts`. */
  defaultCategory: Category;
  /**
   * How to anchor "now":
   *  - "latest": the most recent message across all data (deterministic; default)
   *  - "system": the real current time (passed in by the caller)
   *  - ISO string: a fixed reference instant
   */
  now: "latest" | "system" | string;
  /** Analysis window in days. Trends compare the recent half vs the prior half. */
  windowDays: number;
}

export const DEFAULT_CONFIG: Omit<Config, "me"> = {
  contacts: [],
  workHours: { start: 9, end: 18, days: [1, 2, 3, 4, 5] },
  defaultCategory: "unknown",
  now: "latest",
  windowDays: 90,
};

/* ----------------------------- Analytics outputs ---------------------------- */

export interface ScoreWeights {
  recency: number;
  frequency: number;
  reciprocity: number;
  responsiveness: number;
  initiation: number;
}

/** Default weights for the composite interaction score. They sum to 1. */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  recency: 0.3,
  frequency: 0.25,
  reciprocity: 0.2,
  responsiveness: 0.15,
  initiation: 0.1,
};

export interface ScoreBreakdown {
  /** How recently you last spoke (1 = today, decays over time). */
  recency: number;
  /** How often you talk, relative to a healthy cadence. */
  frequency: number;
  /** Two-way balance of who sends how much (1 = perfectly mutual). */
  reciprocity: number;
  /** How quickly you reply to them (1 = fast). */
  responsiveness: number;
  /** Balance of who starts conversations (1 = mutual). */
  initiation: number;
}

export type ScoreGrade = "thriving" | "steady" | "cooling" | "fading";

export interface InteractionScore {
  contact: string;
  category: Category;
  isGroup: boolean;
  /** Composite 0–100. */
  score: number;
  grade: ScoreGrade;
  breakdown: ScoreBreakdown;
  /** Convenience stats surfaced alongside the score. */
  stats: {
    total: number;
    sent: number;
    received: number;
    lastContactDays: number;
    medianReplyMins: number | null;
  };
}

export type DebtOwner = "me" | "them";

export interface ReplyDebt {
  contact: string;
  category: Category;
  isGroup: boolean;
  /** "me" = you owe them a reply; "them" = you're waiting on them. */
  owedBy: DebtOwner;
  /** Consecutive unanswered messages in the trailing run. */
  unansweredCount: number;
  /** Time since the first unanswered message in the trailing run. */
  waitingMs: number;
  waitingHuman: string;
  lastMessageText: string;
  lastMessageAt: Date;
}

export interface BalanceReport {
  totalMessages: number;
  workMessages: number;
  personalMessages: number;
  unknownMessages: number;
  /** Fraction of categorized traffic that is work. */
  workShare: number;
  afterHoursWork: {
    count: number;
    /** Fraction of work messages that landed outside working hours. */
    share: number;
    byContact: { contact: string; count: number }[];
  };
  /** Hour of day (0–23) with the most traffic. */
  busiestHour: number;
  /** Per-weekday message counts, index 0=Sun … 6=Sat. */
  byWeekday: number[];
}

export type TrendDirection = "rising" | "falling" | "steady";

export interface Trend {
  contact: string;
  category: Category;
  isGroup: boolean;
  recentPerWeek: number;
  priorPerWeek: number;
  /** (recent − prior) / prior, clamped for display. */
  changePct: number;
  direction: TrendDirection;
}

export type NudgeKind =
  | "reply-debt"
  | "drifting"
  | "boundary"
  | "responsiveness"
  | "rekindle";

export interface Nudge {
  kind: NudgeKind;
  contact: string;
  category: Category;
  /** 0–100; higher sorts first. */
  priority: number;
  message: string;
}

export interface Report {
  generatedAt: Date;
  referenceNow: Date;
  windowDays: number;
  me: string;
  conversationCount: number;
  messageCount: number;
  scores: InteractionScore[];
  replyDebts: ReplyDebt[];
  balance: BalanceReport;
  trends: Trend[];
  nudges: Nudge[];
}
