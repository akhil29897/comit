import { describe, expect, test } from "bun:test";
import { interactionScore, gradeFor } from "../src/core/analytics/interactionScore.ts";
import { replyDebt } from "../src/core/analytics/replyDebt.ts";
import { balanceReport } from "../src/core/analytics/balance.ts";
import { trends } from "../src/core/analytics/trends.ts";
import { buildNudges } from "../src/core/analytics/nudges.ts";
import { buildConfig } from "../src/core/config.ts";
import { DEFAULT_WEIGHTS, type Conversation, type Direction, type Message } from "../src/core/types.ts";
import { DAY, humanizeDuration } from "../src/core/util.ts";

const NOW = new Date(2024, 0, 31, 12, 0, 0); // Wed 31 Jan 2024, noon
const config = buildConfig({ me: "Akhil" });

function daysAgo(n: number, hour = 12): Date {
  const d = new Date(NOW.getTime() - n * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function m(direction: Direction, date: Date, opts: Partial<Message> = {}): Message {
  return {
    timestamp: date,
    ts: date.getTime(),
    sender: direction === "out" ? "Akhil" : "Them",
    direction,
    text: opts.text ?? "hi",
    isMedia: opts.isMedia ?? false,
    hour: date.getHours(),
    weekday: date.getDay(),
  };
}

function conv(messages: Message[], over: Partial<Conversation> = {}): Conversation {
  return {
    contact: over.contact ?? "Them",
    isGroup: over.isGroup ?? false,
    category: over.category ?? "personal",
    tags: [],
    messages: [...messages].sort((a, b) => a.ts - b.ts),
  };
}

describe("gradeFor", () => {
  test("maps scores to grades at the documented cutoffs", () => {
    expect(gradeFor(85)).toBe("thriving");
    expect(gradeFor(70)).toBe("thriving");
    expect(gradeFor(50)).toBe("steady");
    expect(gradeFor(30)).toBe("cooling");
    expect(gradeFor(10)).toBe("fading");
  });
});

describe("interactionScore", () => {
  test("a frequent, reciprocal, recent chat scores high", () => {
    const msgs: Message[] = [];
    for (let d = 1; d <= 30; d++) {
      msgs.push(m("in", daysAgo(d, 10)));
      msgs.push(m("out", daysAgo(d, 11)));
    }
    const s = interactionScore(conv(msgs), NOW, DEFAULT_WEIGHTS, 90);
    expect(s.score).toBeGreaterThan(55);
    expect(s.breakdown.reciprocity).toBeCloseTo(1, 1);
    expect(s.stats.sent).toBe(30);
    expect(s.stats.received).toBe(30);
  });

  test("a stale, sparse chat scores low", () => {
    const s = interactionScore(
      conv([m("in", daysAgo(80, 0)), m("out", daysAgo(80, 1))]),
      NOW,
      DEFAULT_WEIGHTS,
      90,
    );
    expect(s.score).toBeLessThan(40);
  });

  test("all breakdown components stay within 0..1", () => {
    const s = interactionScore(
      conv([m("in", daysAgo(3)), m("out", daysAgo(3, 13)), m("in", daysAgo(1))]),
      NOW,
      DEFAULT_WEIGHTS,
      90,
    );
    for (const v of Object.values(s.breakdown)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("replyDebt", () => {
  test("an inbound trailing run means you owe them", () => {
    const d = replyDebt(
      conv([m("out", daysAgo(5)), m("in", daysAgo(2, 10)), m("in", daysAgo(2, 11))]),
      NOW,
    );
    expect(d?.owedBy).toBe("me");
    expect(d?.unansweredCount).toBe(2);
    expect(Math.round((d?.waitingMs ?? 0) / DAY)).toBe(2);
  });

  test("an outbound trailing message means you're waiting on them", () => {
    const d = replyDebt(conv([m("in", daysAgo(3)), m("out", daysAgo(1))]), NOW);
    expect(d?.owedBy).toBe("them");
    expect(d?.unansweredCount).toBe(1);
  });

  test("a media last message previews as [media]", () => {
    const d = replyDebt(conv([m("in", daysAgo(1), { isMedia: true, text: "" })]), NOW);
    expect(d?.lastMessageText).toBe("[media]");
  });
});

describe("balanceReport", () => {
  test("counts after-hours work messages and overall work share", () => {
    const work = conv(
      [m("in", daysAgo(1, 23)), m("in", daysAgo(2, 10)), m("out", daysAgo(2, 11))],
      { category: "work", contact: "Boss" },
    );
    const personal = conv([m("in", daysAgo(1, 20)), m("out", daysAgo(1, 21))], {
      category: "personal",
      contact: "Friend",
    });
    const b = balanceReport([work, personal], config, NOW);
    expect(b.workMessages).toBe(3);
    expect(b.personalMessages).toBe(2);
    expect(b.afterHoursWork.count).toBe(1); // the 23:00 one
    expect(b.workShare).toBeCloseTo(0.6, 2);
  });
});

describe("trends", () => {
  test("more recent activity than prior reads as rising", () => {
    const msgs = [
      m("in", daysAgo(60)),
      m("in", daysAgo(15)),
      m("out", daysAgo(14)),
      m("in", daysAgo(10)),
      m("out", daysAgo(9)),
      m("in", daysAgo(3)),
    ];
    const t = trends([conv(msgs)], config, NOW);
    expect(t[0]?.direction).toBe("rising");
  });
});

describe("buildNudges", () => {
  test("never raises a reply-debt nudge for a group", () => {
    const groupDebt = replyDebt(conv([m("in", daysAgo(2))], { isGroup: true, contact: "Group" }), NOW)!;
    const personDebt = replyDebt(conv([m("in", daysAgo(2))], { isGroup: false, contact: "Riya" }), NOW)!;
    const balance = balanceReport([], config, NOW);
    const nudges = buildNudges({
      scores: [],
      debts: [groupDebt, personDebt],
      trends: [],
      balance,
      config,
      referenceNow: NOW,
    });
    const replyContacts = nudges.filter((n) => n.kind === "reply-debt").map((n) => n.contact);
    expect(replyContacts).toContain("Riya");
    expect(replyContacts).not.toContain("Group");
  });
});

describe("humanizeDuration", () => {
  test("rounds to the largest sensible unit", () => {
    expect(humanizeDuration(30_000)).toBe("just now");
    expect(humanizeDuration(90_000)).toBe("1 minute");
    expect(humanizeDuration(3 * DAY)).toBe("3 days");
    expect(humanizeDuration(2 * 7 * DAY)).toBe("2 weeks");
  });
});
