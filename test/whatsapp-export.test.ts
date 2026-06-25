import { describe, expect, test } from "bun:test";
import { parseWhatsAppExport } from "../src/core/sources/whatsapp-export.ts";

const onlyMessages = (text: string) =>
  parseWhatsAppExport(text).messages.filter((m) => m.kind === "message");

describe("parseWhatsAppExport — Android format", () => {
  const ANDROID = [
    "15/01/2024, 09:41 - Messages and calls are end-to-end encrypted. Tap to learn more.",
    "15/01/2024, 09:42 - Riya: Are we still on?",
    "This is a second line.",
    "15/01/2024, 09:45 - Akhil: Yes! 7pm.",
    "15/01/2024, 09:46 - Riya: <Media omitted>",
  ].join("\n");

  test("detects the format and senders", () => {
    const r = parseWhatsAppExport(ANDROID);
    expect(r.format).toBe("android");
    expect(r.dayFirst).toBe(true); // 15 > 12 forces day-first
    expect(new Set(r.senders)).toEqual(new Set(["Riya", "Akhil"]));
  });

  test("keeps system lines but flags them as system", () => {
    const all = parseWhatsAppExport(ANDROID).messages;
    expect(all[0]?.kind).toBe("system");
    expect(onlyMessages(ANDROID)).toHaveLength(3);
  });

  test("folds continuation lines into the previous message", () => {
    const first = onlyMessages(ANDROID)[0];
    expect(first?.text).toBe("Are we still on?\nThis is a second line.");
  });

  test("normalizes media placeholders", () => {
    const media = onlyMessages(ANDROID).at(-1);
    expect(media?.isMedia).toBe(true);
    expect(media?.text).toBe("");
  });

  test("parses the timestamp correctly", () => {
    const m = onlyMessages(ANDROID)[0];
    expect(m?.timestamp.getFullYear()).toBe(2024);
    expect(m?.timestamp.getMonth()).toBe(0); // January
    expect(m?.timestamp.getDate()).toBe(15);
    expect(m?.timestamp.getHours()).toBe(9);
    expect(m?.timestamp.getMinutes()).toBe(42);
  });
});

describe("parseWhatsAppExport — iOS format", () => {
  const IOS = [
    "[15/01/2024, 9:41:03 AM] Riya: Morning!",
    "[15/01/2024, 2:15:00 PM] Akhil: Afternoon!",
  ].join("\n");

  test("detects iOS layout and 12h clock", () => {
    const r = parseWhatsAppExport(IOS);
    expect(r.format).toBe("ios");
    const msgs = r.messages.filter((m) => m.kind === "message");
    expect(msgs[0]?.timestamp.getHours()).toBe(9); // 9 AM
    expect(msgs[1]?.timestamp.getHours()).toBe(14); // 2 PM -> 14:00
  });
});

describe("parseWhatsAppExport — locale date order", () => {
  test("infers month-first when the second field exceeds 12", () => {
    const r = parseWhatsAppExport("02/13/2024, 10:00 - Riya: hi");
    expect(r.dayFirst).toBe(false);
    const m = r.messages.find((x) => x.kind === "message");
    expect(m?.timestamp.getMonth()).toBe(1); // February
    expect(m?.timestamp.getDate()).toBe(13);
  });

  test("falls back to day-first when ambiguous", () => {
    const r = parseWhatsAppExport("05/06/2024, 10:00 - Riya: hi");
    expect(r.dayFirst).toBe(true);
    const m = r.messages.find((x) => x.kind === "message");
    expect(m?.timestamp.getDate()).toBe(5);
    expect(m?.timestamp.getMonth()).toBe(5); // June
  });
});

describe("parseWhatsAppExport — groups", () => {
  const GROUP = [
    '15/01/2024, 10:00 - Akhil created group "Test Group"',
    "15/01/2024, 10:01 - Akhil: hey all",
    "15/01/2024, 10:02 - Riya: hi!",
    "15/01/2024, 10:03 - Sam: yo",
  ].join("\n");

  test("detects a group and extracts its title", () => {
    const r = parseWhatsAppExport(GROUP);
    expect(r.isGroup).toBe(true);
    expect(r.title).toBe("Test Group");
  });
});

describe("parseWhatsAppExport — robustness", () => {
  test("a message containing a colon keeps its full text", () => {
    const r = parseWhatsAppExport("15/01/2024, 10:00 - Riya: note: bring snacks");
    const m = r.messages.find((x) => x.kind === "message");
    expect(m?.sender).toBe("Riya");
    expect(m?.text).toBe("note: bring snacks");
  });

  test("empty input yields no messages", () => {
    expect(parseWhatsAppExport("").messages).toHaveLength(0);
  });
});
