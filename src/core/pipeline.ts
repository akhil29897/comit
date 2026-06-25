import type { Config, Report, ReplyDebt, ScoreWeights } from "./types.ts";
import { DEFAULT_WEIGHTS } from "./types.ts";
import type { DataSource, RawConversation } from "./sources/source.ts";
import { normalize, resolveReferenceNow } from "./normalize.ts";
import { interactionScore } from "./analytics/interactionScore.ts";
import { replyDebts } from "./analytics/replyDebt.ts";
import { balanceReport } from "./analytics/balance.ts";
import { trends } from "./analytics/trends.ts";
import { buildNudges } from "./analytics/nudges.ts";

export interface AnalyzeOptions {
  /** Override the default score weights. */
  weights?: ScoreWeights;
  /** Real wall-clock time, used when config.now === "system". */
  systemNow?: Date;
}

/**
 * The full analysis pipeline: normalize → score → debt → balance → trends →
 * nudges. Pure and deterministic given the same inputs.
 */
export function analyze(
  raw: RawConversation[],
  config: Config,
  opts: AnalyzeOptions = {},
): Report {
  const conversations = normalize(raw, config);
  const referenceNow = resolveReferenceNow(conversations, config, opts.systemNow);
  const weights = opts.weights ?? DEFAULT_WEIGHTS;

  const scores = conversations
    .map((c) => interactionScore(c, referenceNow, weights, config.windowDays))
    .sort((a, b) => b.score - a.score);

  const debts = replyDebts(conversations, referenceNow).sort(debtSort);
  const balance = balanceReport(conversations, config, referenceNow);
  const trendList = trends(conversations, config, referenceNow);
  const nudges = buildNudges({
    scores,
    debts,
    trends: trendList,
    balance,
    config,
    referenceNow,
  });

  const messageCount = conversations.reduce((n, c) => n + c.messages.length, 0);

  return {
    generatedAt: opts.systemNow ?? referenceNow,
    referenceNow,
    windowDays: config.windowDays,
    me: config.me,
    conversationCount: conversations.length,
    messageCount,
    scores,
    replyDebts: debts,
    balance,
    trends: trendList,
    nudges,
  };
}

/** Convenience: load a source, then analyze. */
export async function analyzeSource(
  source: DataSource,
  config: Config,
  opts: AnalyzeOptions = {},
): Promise<Report> {
  const raw = await source.load();
  return analyze(raw, config, opts);
}

/** Debts you owe come first, longest-waiting first; then the rest. */
function debtSort(a: ReplyDebt, b: ReplyDebt): number {
  if (a.owedBy !== b.owedBy) return a.owedBy === "me" ? -1 : 1;
  return b.waitingMs - a.waitingMs;
}
