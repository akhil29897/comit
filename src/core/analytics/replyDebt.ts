import type { Conversation, Message, ReplyDebt } from "../types.ts";
import { humanizeDuration } from "../util.ts";

/**
 * Inspect the *trailing run* of a conversation to decide who owes a reply.
 *
 * If the last message is inbound, you owe them (owedBy "me"); if outbound,
 * you're waiting on them (owedBy "them"). The wait is measured from the first
 * message of that unanswered run — so three quick messages from a friend three
 * days ago reads as "3 days", not the gap since their most recent line.
 */
export function replyDebt(conv: Conversation, referenceNow: Date): ReplyDebt | null {
  const msgs = conv.messages;
  if (msgs.length === 0) return null;

  const now = referenceNow.getTime();
  const last = msgs.at(-1) as Message;
  const dir = last.direction;

  // Walk back over the contiguous trailing run of the same direction.
  let i = msgs.length - 1;
  while (i >= 0 && (msgs[i] as Message).direction === dir) i--;
  const runStart = msgs[i + 1] as Message;
  const unansweredCount = msgs.length - 1 - i;
  const waitingMs = Math.max(0, now - runStart.ts);

  return {
    contact: conv.contact,
    category: conv.category,
    isGroup: conv.isGroup,
    owedBy: dir === "in" ? "me" : "them",
    unansweredCount,
    waitingMs,
    waitingHuman: humanizeDuration(waitingMs),
    lastMessageText: previewText(last),
    lastMessageAt: last.timestamp,
  };
}

function previewText(m: Message): string {
  if (m.isMedia) return "[media]";
  const t = m.text.replace(/\s+/g, " ").trim();
  if (t.length === 0) return "[media]";
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}

/** Compute reply debts across all conversations, newest-owed first. */
export function replyDebts(conversations: Conversation[], referenceNow: Date): ReplyDebt[] {
  return conversations
    .map((c) => replyDebt(c, referenceNow))
    .filter((d): d is ReplyDebt => d !== null);
}
