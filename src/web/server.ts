/**
 * comit dashboard — a tiny local web server.
 *
 * Serves a static single-page dashboard and one JSON endpoint, `/api/report`,
 * which runs the same pure pipeline the CLI uses. Nothing leaves your machine:
 * no external requests, no CDNs, no telemetry. Point it at your own export with
 * COMIT_SOURCE / COMIT_ME / COMIT_CONFIG, or just run the bundled demo data.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { analyzeSource } from "../core/pipeline.ts";
import { WhatsAppExportSource } from "../core/sources/whatsapp-file-source.ts";
import { buildConfig, type ConfigInput } from "../core/config.ts";

const PORT = Number(process.env.PORT ?? 4317);
const PUBLIC = join(import.meta.dir, "public");
const ROOT = join(import.meta.dir, "..", "..");

const SOURCE = process.env.COMIT_SOURCE ?? join(ROOT, "fixtures", "sample-export");
const ME = process.env.COMIT_ME ?? "Akhil";
const CONFIG_PATH = process.env.COMIT_CONFIG ?? join(ROOT, "fixtures", "comit.config.json");

function loadConfig() {
  let input: ConfigInput = { me: ME };
  if (existsSync(CONFIG_PATH)) {
    input = { ...(JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as ConfigInput), me: ME };
  }
  return buildConfig(input);
}

async function buildReport() {
  const config = loadConfig();
  const source = new WhatsAppExportSource(SOURCE, config.me);
  return analyzeSource(source, config, { systemNow: new Date() });
}

function serveStatic(pathname: string): Response {
  const rel = pathname === "/" ? "/index.html" : pathname;
  // Prevent path traversal: resolve and confirm it stays under PUBLIC.
  const filePath = normalize(join(PUBLIC, rel));
  if (!filePath.startsWith(PUBLIC) || !existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(Bun.file(filePath));
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/report") {
      try {
        const report = await buildReport();
        return Response.json({ ...report, source: SOURCE });
      } catch (err) {
        return Response.json({ error: (err as Error).message }, { status: 500 });
      }
    }
    return serveStatic(url.pathname);
  },
});

console.log(`\n  comit dashboard → http://localhost:${server.port}`);
console.log(`  source: ${SOURCE}`);
console.log(`  (set COMIT_SOURCE, COMIT_ME, COMIT_CONFIG to use your own export)\n`);
