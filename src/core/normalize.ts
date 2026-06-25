import type { Config, Conversation, Message } from "./types.ts";
import type { RawConversation } from "./sources/source.ts";

/**
 * Turn raw conversations (straight from a source) into normalized,
 * categorized conversations the analytics can consume:
 *  - drop system lines,
 *  - tag each message with direction (in/out) relative to `me`,
 *  - pre-compute local hour + weekday,
 *  - attach the contact's work/personal category and tags.
 */
export function normalize(raw: RawConversation[], config: Config): Conversation[] {
  return raw
    .map((conv) => normalizeConversation(conv, config))
    .filter((conv) => conv.messages.length > 0);
}

function normalizeConversation(conv: RawConversation, config: Config): Conversation {
  const cfg = findContactConfig(conv.contact, config);
  const messages: Message[] = conv.messages
    .filter((m) => m.kind === "message")
    .map((m) => {
      const ts = m.timestamp.getTime();
      return {
        timestamp: m.timestamp,
        ts,
        sender: m.sender,
        direction: m.sender === config.me ? ("out" as const) : ("in" as const),
        text: m.text,
        isMedia: m.isMedia,
        hour: m.timestamp.getHours(),
        weekday: m.timestamp.getDay(),
      };
    })
    .sort((a, b) => a.ts - b.ts);

  return {
    contact: cfg?.alias ?? conv.contact,
    isGroup: conv.isGroup,
    category: cfg?.category ?? config.defaultCategory,
    tags: cfg?.tags ?? [],
    messages,
  };
}

function findContactConfig(contact: string, config: Config) {
  const needle = contact.trim().toLowerCase();
  return config.contacts.find(
    (c) =>
      c.name.trim().toLowerCase() === needle ||
      c.alias?.trim().toLowerCase() === needle,
  );
}

/**
 * Resolve the reference "now" used throughout the analytics, honoring
 * `config.now`. Pure: the real clock is only consulted when the caller passes
 * `systemNow` and `config.now === "system"`.
 */
export function resolveReferenceNow(
  conversations: Conversation[],
  config: Config,
  systemNow?: Date,
): Date {
  if (config.now === "system") {
    return systemNow ?? new Date();
  }
  if (config.now !== "latest") {
    const parsed = new Date(config.now);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  // "latest": newest message across everything.
  let max = 0;
  for (const conv of conversations) {
    for (const m of conv.messages) {
      if (m.ts > max) max = m.ts;
    }
  }
  return max > 0 ? new Date(max) : (systemNow ?? new Date(0));
}
