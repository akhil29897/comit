import type { BalanceReport, Config, Conversation, Message } from "../types.ts";
import { DAY, round } from "../util.ts";

interface Tagged {
  contact: string;
  category: Conversation["category"];
  msg: Message;
}

/**
 * Aggregate work-life balance signals across all conversations in the window:
 * how much of your traffic is work, how much of that work spills outside
 * working hours, and when your day is busiest.
 */
export function balanceReport(
  conversations: Conversation[],
  config: Config,
  referenceNow: Date,
): BalanceReport {
  const now = referenceNow.getTime();
  const windowStart = now - config.windowDays * DAY;

  const tagged: Tagged[] = [];
  for (const conv of conversations) {
    for (const msg of conv.messages) {
      if (msg.ts >= windowStart && msg.ts <= now) {
        tagged.push({ contact: conv.contact, category: conv.category, msg });
      }
    }
  }

  let workMessages = 0;
  let personalMessages = 0;
  let unknownMessages = 0;
  let afterHoursWork = 0;
  const afterHoursByContact = new Map<string, number>();
  const byHour = new Array<number>(24).fill(0);
  const byWeekday = new Array<number>(7).fill(0);

  for (const t of tagged) {
    if (t.category === "work") workMessages++;
    else if (t.category === "personal") personalMessages++;
    else unknownMessages++;

    byHour[t.msg.hour] = (byHour[t.msg.hour] ?? 0) + 1;
    byWeekday[t.msg.weekday] = (byWeekday[t.msg.weekday] ?? 0) + 1;

    if (t.category === "work" && !withinWorkHours(t.msg, config)) {
      afterHoursWork++;
      afterHoursByContact.set(t.contact, (afterHoursByContact.get(t.contact) ?? 0) + 1);
    }
  }

  const categorized = workMessages + personalMessages;
  const busiestHour = byHour.reduce(
    (best, count, hour) => (count > (byHour[best] ?? 0) ? hour : best),
    0,
  );

  return {
    totalMessages: tagged.length,
    workMessages,
    personalMessages,
    unknownMessages,
    workShare: categorized === 0 ? 0 : round(workMessages / categorized, 3),
    afterHoursWork: {
      count: afterHoursWork,
      share: workMessages === 0 ? 0 : round(afterHoursWork / workMessages, 3),
      byContact: [...afterHoursByContact.entries()]
        .map(([contact, count]) => ({ contact, count }))
        .sort((a, b) => b.count - a.count),
    },
    busiestHour,
    byWeekday,
  };
}

/** True if a message falls inside configured working hours. */
export function withinWorkHours(msg: Message, config: Config): boolean {
  const { start, end, days } = config.workHours;
  if (!days.includes(msg.weekday)) return false;
  return msg.hour >= start && msg.hour < end;
}
