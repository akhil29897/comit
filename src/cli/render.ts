/** Terminal rendering for comit reports — zero dependencies, NO_COLOR aware. */
import type {
  BalanceReport,
  InteractionScore,
  Nudge,
  Report,
  ReplyDebt,
  Trend,
} from "../core/types.ts";
import { WEEKDAY_NAMES, formatHour } from "../core/util.ts";

const useColor =
  process.env.NO_COLOR === undefined && process.env.COMIT_NO_COLOR === undefined;

type Style = (s: string) => string;
const code = (open: number, close: number): Style => (s) =>
  useColor ? `\x1b[${open}m${s}\x1b[${close}m` : s;

export const c = {
  bold: code(1, 22),
  dim: code(2, 22),
  red: code(31, 39),
  green: code(32, 39),
  yellow: code(33, 39),
  blue: code(34, 39),
  magenta: code(35, 39),
  cyan: code(36, 39),
  gray: code(90, 39),
};

/** Strip ANSI to measure printable width. */
function width(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}
function padEnd(s: string, n: number): string {
  return s + " ".repeat(Math.max(0, n - width(s)));
}
function padStart(s: string, n: number): string {
  return " ".repeat(Math.max(0, n - width(s))) + s;
}

/** A proportional block bar, 0..1 over `w` cells. */
export function bar(value: number, w = 18): string {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * w);
  return "█".repeat(filled) + c.gray("░".repeat(w - filled));
}

function scoreStyle(score: number): Style {
  if (score >= 70) return c.green;
  if (score >= 45) return c.cyan;
  if (score >= 25) return c.yellow;
  return c.red;
}

const GRADE_LABEL: Record<string, string> = {
  thriving: "thriving",
  steady: "steady",
  cooling: "cooling",
  fading: "fading",
};

function rule(label = ""): string {
  const line = "─".repeat(Math.max(0, 58 - width(label)));
  return c.gray(label ? `── ${label} ${line}` : `──${line}───`);
}

/** Render a simple aligned table. Cells may contain ANSI. */
function table(headers: string[], rows: string[][], align: ("l" | "r")[] = []): string {
  const cols = headers.length;
  const w: number[] = [];
  for (let i = 0; i < cols; i++) {
    w[i] = width(headers[i] ?? "");
    for (const row of rows) w[i] = Math.max(w[i] as number, width(row[i] ?? ""));
  }
  const fmtRow = (cells: string[], styler?: Style) =>
    cells
      .map((cell, i) => {
        const a = align[i] ?? "l";
        const padded = a === "r" ? padStart(cell, w[i] as number) : padEnd(cell, w[i] as number);
        return styler ? styler(padded) : padded;
      })
      .join("  ");
  const out = [fmtRow(headers, c.dim)];
  for (const row of rows) out.push(fmtRow(row));
  return out.join("\n");
}

export function banner(): string {
  return [
    "",
    c.bold(c.magenta("  comit")) + c.dim("  ·  commit to the people who matter"),
    c.gray("  a privacy-first WhatsApp work-life-balance companion"),
    "",
  ].join("\n");
}

export function renderSummary(r: Report): string {
  const when = r.referenceNow.toISOString().slice(0, 10);
  return c.dim(
    `  ${r.conversationCount} conversations · ${r.messageCount} messages · ${r.windowDays}-day window · as of ${when}`,
  );
}

export function renderNudges(nudges: Nudge[]): string {
  if (nudges.length === 0) return rule("nudges") + "\n  " + c.green("All clear — nothing nagging right now. ✦");
  const icon: Record<string, string> = {
    "reply-debt": c.yellow("↩"),
    drifting: c.blue("≀"),
    boundary: c.red("⚠"),
    responsiveness: c.cyan("⏱"),
    rekindle: c.magenta("✦"),
  };
  const lines = nudges.map((n) => `  ${icon[n.kind] ?? "•"}  ${n.message}`);
  return rule("nudges  (what to do)") + "\n" + lines.join("\n");
}

export function renderScores(scores: InteractionScore[], top = 12): string {
  const rows = scores.slice(0, top).map((s) => {
    const styled = scoreStyle(s.score);
    const last =
      s.stats.lastContactDays < 1 ? "today" : `${Math.round(s.stats.lastContactDays)}d ago`;
    return [
      s.contact,
      styled(String(s.score).padStart(4)) + " " + bar(s.score / 100, 14),
      styled(GRADE_LABEL[s.grade] ?? s.grade),
      last,
      c.dim(`${s.stats.sent}/${s.stats.received}`),
      catTag(s.category),
    ];
  });
  return (
    rule("interaction scores") +
    "\n" +
    table(
      ["contact", "score", "grade", "last", "sent/recv", "type"],
      rows,
      ["l", "l", "l", "r", "r", "l"],
    )
  );
}

export function renderDebts(debts: ReplyDebt[]): string {
  const owed = debts.filter((d) => d.owedBy === "me" && !d.isGroup);
  if (owed.length === 0) return rule("reply debt") + "\n  " + c.green("Inbox zero — you owe no one a reply. ✦");
  const rows = owed.map((d) => [
    d.contact,
    c.yellow(d.waitingHuman),
    catTag(d.category),
    c.dim(`“${d.lastMessageText}”`),
  ]);
  return (
    rule("reply debt  (you owe a reply)") +
    "\n" +
    table(["contact", "waiting", "type", "their last message"], rows, ["l", "r", "l", "l"])
  );
}

export function renderBalance(b: BalanceReport): string {
  const workPct = Math.round(b.workShare * 100);
  const ahPct = Math.round(b.afterHoursWork.share * 100);
  const maxDay = Math.max(1, ...b.byWeekday);
  const spark = b.byWeekday
    .map((n, i) => `${c.dim(WEEKDAY_NAMES[i] ?? "")} ${bar(n / maxDay, 6)}`)
    .join("   ");
  const lines = [
    `  work vs personal   ${bar(b.workShare, 18)} ${c.bold(`${workPct}%`)} work`,
    `  after-hours work   ${c.bold(String(b.afterHoursWork.count))} messages ` +
      c.dim(`(${ahPct}% of work chatter, outside working hours)`),
    `  busiest hour       ${c.bold(formatHour(b.busiestHour))}`,
    `  by weekday         ${spark}`,
  ];
  if (b.afterHoursWork.byContact.length) {
    const top = b.afterHoursWork.byContact
      .slice(0, 3)
      .map((x) => `${x.contact} (${x.count})`)
      .join(", ");
    lines.push(`  late pingers       ${c.dim(top)}`);
  }
  return rule("work-life balance") + "\n" + lines.join("\n");
}

export function renderTrends(trends: Trend[]): string {
  const moving = trends.filter((t) => t.direction !== "steady");
  if (moving.length === 0) return "";
  const rows = moving.slice(0, 8).map((t) => {
    const arrow = t.direction === "rising" ? c.red("▲") : c.blue("▼");
    const pct = t.changePct >= 0 ? `+${Math.round(t.changePct * 100)}%` : `${Math.round(t.changePct * 100)}%`;
    return [
      `${arrow} ${t.contact}`,
      `${t.priorPerWeek}/wk → ${t.recentPerWeek}/wk`,
      t.direction === "rising" ? c.red(pct) : c.blue(pct),
      catTag(t.category),
    ];
  });
  return rule("momentum") + "\n" + table(["contact", "cadence", "change", "type"], rows, ["l", "l", "r", "l"]);
}

function catTag(cat: string): string {
  if (cat === "work") return c.blue("work");
  if (cat === "personal") return c.magenta("personal");
  return c.gray("—");
}

export function renderReport(r: Report, opts: { top?: number } = {}): string {
  return [
    banner(),
    renderSummary(r),
    "",
    renderNudges(r.nudges),
    "",
    renderScores(r.scores, opts.top),
    "",
    renderDebts(r.replyDebts),
    "",
    renderBalance(r.balance),
    trendBlock(r.trends),
    "",
  ].join("\n");
}

function trendBlock(trends: Trend[]): string {
  const t = renderTrends(trends);
  return t ? "\n" + t : "";
}
