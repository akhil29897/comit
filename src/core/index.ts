/**
 * Public API for comit's core engine.
 *
 * Everything exported here is pure and dependency-free — import it from a CLI,
 * a server, a test, or your own tool.
 */
export * from "./types.ts";
export { buildConfig, type ConfigInput } from "./config.ts";
export { analyze, analyzeSource, type AnalyzeOptions } from "./pipeline.ts";
export { normalize, resolveReferenceNow } from "./normalize.ts";

// Sources
export type { DataSource, RawConversation } from "./sources/source.ts";
export {
  parseWhatsAppExport,
  type ParseResult,
  type ParseOptions,
} from "./sources/whatsapp-export.ts";
export { WhatsAppExportSource } from "./sources/whatsapp-file-source.ts";

// Analytics (exposed for advanced use / testing)
export { interactionScore, gradeFor, SCORE_PARAMS } from "./analytics/interactionScore.ts";
export { replyDebt, replyDebts } from "./analytics/replyDebt.ts";
export { balanceReport, withinWorkHours } from "./analytics/balance.ts";
export { trends, TREND_PARAMS } from "./analytics/trends.ts";
export { buildNudges, NUDGE_PARAMS } from "./analytics/nudges.ts";

// Utilities
export { humanizeDuration, formatHour, WEEKDAY_NAMES } from "./util.ts";
