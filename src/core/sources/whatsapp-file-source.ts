import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { DataSource, RawConversation } from "./source.ts";
import { parseWhatsAppExport, type ParseOptions, type ParseResult } from "./whatsapp-export.ts";

/**
 * Reads WhatsApp chat exports from disk and turns them into raw conversations.
 *
 * `path` may be:
 *   - a single exported .txt file (one conversation), or
 *   - a directory containing several .txt exports (and/or iOS `_chat.txt`
 *     files inside per-contact subfolders).
 *
 * This is the one I/O-bound piece; all parsing logic lives in the pure
 * `parseWhatsAppExport`.
 */
export class WhatsAppExportSource implements DataSource {
  readonly name = "whatsapp-export";

  constructor(
    private readonly path: string,
    private readonly me: string,
    private readonly opts: ParseOptions = {},
  ) {}

  load(): RawConversation[] {
    return this.collectFiles(this.path)
      .map((file) => this.parseFile(file))
      .filter((c) => c.messages.length > 0);
  }

  private collectFiles(path: string): string[] {
    if (!existsSync(path)) {
      throw new Error(`comit: path not found: ${path}`);
    }
    if (statSync(path).isFile()) return [path];

    const files: string[] = [];
    for (const entry of readdirSync(path)) {
      const full = join(path, entry);
      const stat = statSync(full);
      if (stat.isFile() && entry.toLowerCase().endsWith(".txt")) {
        files.push(full);
      } else if (stat.isDirectory()) {
        // iOS exports: a folder per contact containing _chat.txt.
        const inner = join(full, "_chat.txt");
        if (existsSync(inner)) files.push(inner);
      }
    }
    return files;
  }

  private parseFile(file: string): RawConversation {
    const text = readFileSync(file, "utf8");
    const parsed = parseWhatsAppExport(text, this.opts);
    return {
      contact: this.resolveContact(parsed, file),
      isGroup: parsed.isGroup,
      messages: parsed.messages,
    };
  }

  private resolveContact(parsed: ParseResult, file: string): string {
    const fromFile = nameFromPath(file);
    if (parsed.isGroup) return parsed.title ?? fromFile ?? "Group chat";
    const other = parsed.senders.find((s) => s !== this.me);
    return other ?? fromFile ?? "Unknown chat";
  }
}

/** Derive a contact name from an export filename. */
function nameFromPath(file: string): string | undefined {
  const base = basename(file);
  const withName = /WhatsApp Chat with (.+)\.txt$/i.exec(base);
  if (withName) return withName[1];
  if (base.toLowerCase() === "_chat.txt") return basename(dirname(file));
  if (base.toLowerCase().endsWith(".txt")) return base.slice(0, -4);
  return undefined;
}
