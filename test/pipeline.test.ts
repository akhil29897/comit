import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WhatsAppExportSource } from "../src/core/sources/whatsapp-file-source.ts";
import { analyzeSource } from "../src/core/pipeline.ts";
import { buildConfig, type ConfigInput } from "../src/core/config.ts";

const ROOT = join(import.meta.dir, "..");
const FIXTURES = join(ROOT, "fixtures", "sample-export");
const configInput = JSON.parse(
  readFileSync(join(ROOT, "fixtures", "comit.config.json"), "utf8"),
) as ConfigInput;
const config = buildConfig(configInput);

async function run() {
  const source = new WhatsAppExportSource(FIXTURES, config.me);
  return analyzeSource(source, config);
}

describe("pipeline over the sample export", () => {
  test("loads every conversation in the folder", async () => {
    const r = await run();
    expect(r.conversationCount).toBe(6);
    expect(r.messageCount).toBeGreaterThan(100);
  });

  test("scores are sorted high to low", async () => {
    const r = await run();
    const scores = r.scores.map((s) => s.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  test("flags the reply you owe Amma", async () => {
    const r = await run();
    const amma = r.replyDebts.find((d) => d.contact === "Amma");
    expect(amma?.owedBy).toBe("me");
  });

  test("raises an after-hours boundary nudge for the work contact Vinay", async () => {
    const r = await run();
    const boundary = r.nudges.find(
      (n) => n.kind === "boundary" && n.contact === "Vinay" && /after hours/i.test(n.message),
    );
    expect(boundary).toBeDefined();
  });

  test("never nags about replying to the group", async () => {
    const r = await run();
    const groupReplyNudge = r.nudges.find(
      (n) => n.kind === "reply-debt" && n.contact === "DARPAN Crew",
    );
    expect(groupReplyNudge).toBeUndefined();
  });

  test("detects Amma cooling off", async () => {
    const r = await run();
    const amma = r.trends.find((t) => t.contact === "Amma");
    expect(amma?.direction).toBe("falling");
  });
});
