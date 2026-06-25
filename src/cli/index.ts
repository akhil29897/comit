#!/usr/bin/env bun
/**
 * comit — command-line interface.
 *
 *   comit report  <path> --me "Your Name" [--config comit.config.json]
 *   comit scores  <path> --me "Your Name"
 *   comit debts   <path> --me "Your Name"
 *   comit nudges  <path> --me "Your Name"
 *   comit balance <path> --me "Your Name"
 *
 * <path> is an exported WhatsApp .txt file or a folder of them.
 */
import { readFileSync } from "node:fs";
import { buildConfig, type ConfigInput } from "../core/config.ts";
import { analyzeSource } from "../core/pipeline.ts";
import { WhatsAppExportSource } from "../core/sources/whatsapp-file-source.ts";
import type { Config } from "../core/types.ts";
import {
  banner,
  c,
  renderBalance,
  renderDebts,
  renderNudges,
  renderReport,
  renderScores,
  renderSummary,
  renderTrends,
} from "./render.ts";

interface Args {
  command: string;
  path: string | undefined;
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(a);
    }
  }
  return { command: positionals[0] ?? "report", path: positionals[1], flags };
}

const HELP = `${banner()}
${c.bold("Usage")}
  comit <command> <path> [options]

${c.bold("Commands")}
  report    Full report: nudges, scores, reply debt, balance, momentum  ${c.dim("(default)")}
  scores    Interaction scores per contact
  debts     Reply debt — who you owe a reply, and for how long
  nudges    Just the actionable nudges
  balance   Work-life balance breakdown
  help      Show this help

${c.bold("Arguments")}
  <path>    An exported WhatsApp .txt file, or a folder of exports

${c.bold("Options")}
  --me <name>        Your name exactly as it appears in the chat ${c.dim("(required unless in config)")}
  --config <file>    JSON config (contacts, work hours, window). See fixtures/comit.config.json
  --window <days>    Analysis window in days ${c.dim("(default 90)")}
  --now <mode>       Reference time: "latest" | "system" | ISO date ${c.dim("(default latest)")}
  --top <n>          How many contacts to list ${c.dim("(default 12)")}
  --month-first      Parse dates as MM/DD instead of DD/MM
  --json             Emit raw JSON instead of the pretty report
  --no-color         Disable ANSI color

${c.bold("Examples")}
  bun run demo
  comit report ./exports --me "Akhil" --config comit.config.json
  comit debts "./WhatsApp Chat with Riya.txt" --me "Akhil" --json
`;

function loadConfig(flags: Record<string, string | boolean>): Config {
  let input: ConfigInput = { me: typeof flags.me === "string" ? flags.me : "" };
  if (typeof flags.config === "string") {
    const fromFile = JSON.parse(readFileSync(flags.config, "utf8")) as ConfigInput;
    input = { ...fromFile, ...(typeof flags.me === "string" ? { me: flags.me } : {}) };
  }
  if (!input.me) {
    fail('Missing your name. Pass --me "Your Name" (or set "me" in --config).');
  }
  if (typeof flags.window === "string") input.windowDays = Number(flags.window);
  if (typeof flags.now === "string") input.now = flags.now;
  return buildConfig(input);
}

function fail(msg: string): never {
  process.stderr.write(c.red(`\n  ✗ ${msg}\n\n`));
  process.exit(1);
}

async function main() {
  const { command, path, flags } = parseArgs(process.argv.slice(2));

  if (command === "help" || flags.help) {
    process.stdout.write(HELP + "\n");
    return;
  }
  if (command === "version" || flags.version) {
    const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    process.stdout.write(`comit v${pkg.version}\n`);
    return;
  }
  if (flags["no-color"]) process.env.COMIT_NO_COLOR = "1";

  if (!path) fail("No path given. Point comit at a WhatsApp export file or folder.");

  const config = loadConfig(flags);
  const source = new WhatsAppExportSource(path as string, config.me, {
    dayFirst: !flags["month-first"],
  });

  let report;
  try {
    report = await analyzeSource(source, config, { systemNow: new Date() });
  } catch (err) {
    fail((err as Error).message);
  }

  if (flags.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }

  const top = typeof flags.top === "string" ? Number(flags.top) : 12;
  const out: string[] = [];
  switch (command) {
    case "scores":
    case "score":
      out.push(banner(), renderSummary(report), "", renderScores(report.scores, top));
      break;
    case "debts":
    case "debt":
      out.push(banner(), renderSummary(report), "", renderDebts(report.replyDebts));
      break;
    case "nudges":
    case "nudge":
      out.push(banner(), renderSummary(report), "", renderNudges(report.nudges));
      break;
    case "balance":
      out.push(banner(), renderSummary(report), "", renderBalance(report.balance), "", renderTrends(report.trends));
      break;
    case "report":
      out.push(renderReport(report, { top }));
      break;
    default:
      fail(`Unknown command "${command}". Run "comit help".`);
  }
  process.stdout.write(out.join("\n") + "\n");
}

main();
