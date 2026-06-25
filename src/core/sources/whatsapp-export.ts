import type { RawMessage } from "../types.ts";

/**
 * Pure parser for a WhatsApp "Export Chat" .txt file.
 *
 * Handles the two real-world layouts WhatsApp produces:
 *   Android:  15/01/2024, 09:41 - Riya: Are we still on?
 *   iOS:      [15/01/2024, 9:41:03 AM] Riya: Are we still on?
 *
 * …plus 2- and 4-digit years, optional seconds, 12h/24h clocks, locale date
 * order (DD/MM vs MM/DD, auto-detected), multi-line messages, media
 * placeholders, and system notices. It is intentionally I/O-free: text in,
 * structured data out, so it can be exhaustively unit-tested.
 */

export interface ParseResult {
  messages: RawMessage[];
  /** Distinct human senders seen (excludes system lines). */
  senders: string[];
  /** Group subject if one was found in a system line, else undefined. */
  title?: string;
  isGroup: boolean;
  format: "ios" | "android" | "unknown";
  /** Whether dates were interpreted day-first (DD/MM) or month-first (MM/DD). */
  dayFirst: boolean;
}

export interface ParseOptions {
  /**
   * Date order when it can't be inferred from the data. Defaults to true
   * (DD/MM, used across most of the world including India).
   */
  dayFirst?: boolean;
}

// Invisible characters WhatsApp sprinkles into exports.
const LRM = /[‎‏؜]/g; // left-to-right / right-to-left marks
const NBSP = /[  ]/g; // narrow & regular non-breaking spaces

// [15/01/2024, 9:41:03 AM] rest...
const IOS_HEADER =
  /^\[(\d{1,2})[./-](\d{1,2})[./-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([APap]\.?[Mm]\.?))?\]\s*(.*)$/;

// 15/01/2024, 09:41 - rest...
const ANDROID_HEADER =
  /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([APap]\.?[Mm]\.?))?\s+[-–]\s+(.*)$/;

interface HeaderMatch {
  d1: number;
  d2: number;
  year: number;
  hh: number;
  mm: number;
  ss: number;
  ampm: string | undefined;
  rest: string;
  format: "ios" | "android";
}

function sanitize(line: string): string {
  return line.replace(LRM, "").replace(NBSP, " ");
}

function matchHeader(line: string): HeaderMatch | null {
  const ios = IOS_HEADER.exec(line);
  const m = ios ?? ANDROID_HEADER.exec(line);
  if (!m) return null;
  return {
    d1: Number(m[1]),
    d2: Number(m[2]),
    year: Number(m[3]),
    hh: Number(m[4]),
    mm: Number(m[5]),
    ss: m[6] ? Number(m[6]) : 0,
    ampm: m[7],
    rest: m[8] ?? "",
    format: ios ? "ios" : "android",
  };
}

function buildDate(h: HeaderMatch, dayFirst: boolean): Date {
  let { hh } = h;
  const year = h.year < 100 ? 2000 + h.year : h.year;
  const day = dayFirst ? h.d1 : h.d2;
  const month = dayFirst ? h.d2 : h.d1;
  if (h.ampm) {
    const isPM = /p/i.test(h.ampm);
    if (isPM && hh < 12) hh += 12;
    if (!isPM && hh === 12) hh = 0;
  }
  return new Date(year, month - 1, day, hh, h.mm, h.ss);
}

function isMediaText(text: string): boolean {
  const t = text.trim();
  return /\bomitted\b/i.test(t) || /^<attached:/i.test(t);
}

// System notices that still contain a ": " and would otherwise look like a
// message. The encryption notice and most group events have no ": " and are
// caught by the no-colon rule, so this list stays short.
const SYSTEM_HINTS = [
  /messages and calls are end-to-end encrypted/i,
  /your security code with .* changed/i,
];

const GROUP_SUBJECT =
  /(?:created group|changed the subject to|changed the subject from .* to)\s+["“”']([^"“”']+)["“”']/i;

export function parseWhatsAppExport(
  text: string,
  opts: ParseOptions = {},
): ParseResult {
  const rawLines = text.split(/\r?\n/);

  // Pass A: gather header entries, folding continuation lines into the prior one.
  interface Entry {
    header: HeaderMatch;
    lines: string[];
  }
  const entries: Entry[] = [];
  let format: "ios" | "android" | "unknown" = "unknown";

  for (const raw of rawLines) {
    const line = sanitize(raw);
    const header = matchHeader(line);
    if (header) {
      if (format === "unknown") format = header.format;
      entries.push({ header, lines: [header.rest] });
    } else if (entries.length > 0 && raw.length > 0) {
      // Continuation of the previous message (newline inside a message body).
      (entries.at(-1) as Entry).lines.push(raw.replace(LRM, "").replace(NBSP, " "));
    }
    // Lines before the first header (rare) are dropped.
  }

  // Decide date order from evidence: a first component > 12 must be a day;
  // a second component > 12 means the first is a month.
  let sawDayGt12 = false;
  let sawMonthGt12 = false;
  for (const e of entries) {
    if (e.header.d1 > 12) sawDayGt12 = true;
    if (e.header.d2 > 12) sawMonthGt12 = true;
  }
  const dayFirst = sawDayGt12 ? true : sawMonthGt12 ? false : opts.dayFirst ?? true;

  // Pass B: classify and normalize.
  const messages: RawMessage[] = [];
  const senders = new Set<string>();
  let title: string | undefined;

  for (const e of entries) {
    const body = e.lines.join("\n");
    const colon = body.indexOf(": ");
    const sender = colon > -1 ? body.slice(0, colon) : "";
    const looksLikeMessage =
      colon > -1 && sender.length <= 60 && !SYSTEM_HINTS.some((re) => re.test(body));

    if (!looksLikeMessage) {
      const subject = GROUP_SUBJECT.exec(body);
      if (subject) title = subject[1];
      messages.push({
        timestamp: buildDate(e.header, dayFirst),
        sender: "",
        text: body,
        kind: "system",
        isMedia: false,
      });
      continue;
    }

    const text = body.slice(colon + 2);
    senders.add(sender);
    messages.push({
      timestamp: buildDate(e.header, dayFirst),
      sender,
      text: isMediaText(text) ? "" : text,
      kind: "message",
      isMedia: isMediaText(text),
    });
  }

  return {
    messages,
    senders: [...senders],
    title,
    isGroup: senders.size > 2 || (title !== undefined && senders.size > 1),
    format,
    dayFirst,
  };
}
