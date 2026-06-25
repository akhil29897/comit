import type { RawMessage } from "../types.ts";

/**
 * A raw conversation as produced by a data source, before categorization and
 * normalization in the pipeline.
 */
export interface RawConversation {
  /** Best-known name for the other party (1:1) or the group title. */
  contact: string;
  isGroup: boolean;
  messages: RawMessage[];
}

/**
 * A `DataSource` is anything that can produce raw conversations.
 *
 * Today there is one implementation — the WhatsApp chat-export parser — which
 * is safe, offline, and ToS-clean. The interface exists so that a *live*
 * source (e.g. a Baileys companion-device adapter) can be dropped in later
 * without touching the analytics: it would just be another `DataSource`.
 *
 * Keeping I/O behind this seam is what lets every analytics module stay pure
 * and unit-testable.
 */
export interface DataSource {
  /** Human-readable label, surfaced in logs and the dashboard. */
  readonly name: string;
  /** Load and return all conversations this source can see. */
  load(): Promise<RawConversation[]> | RawConversation[];
}
