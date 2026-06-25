/**
 * Deterministic synthetic WhatsApp exports for comit's demo + tests.
 *
 * No real chat data ever ships in this repo. This script fabricates believable
 * conversations — seeded RNG, fixed reference date — so `bun run demo` always
 * shows the same, explainable result. Each persona is designed to trigger one
 * comit feature:
 *
 *   Riya    personal  thriving baseline (frequent, reciprocal, fast, recent)
 *   Vinay   work      after-hours pings + rising  -> boundary nudges + debt
 *   Amma    personal  was daily, now quiet        -> drifting nudge + debt
 *   Karan   personal  you reply very slowly       -> responsiveness nudge
 *   Sourav  work      steady, daytime, balanced   -> healthy work contact
 *   "DARPAN Crew"     a small group thread
 *
 * Run: bun run scripts/generate-fixtures.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(import.meta.dir, "..", "fixtures", "sample-export");
const ME = "Akhil";
// Fixed anchor so "latest" reference-now is stable across machines/time.
const BASE = new Date(2026, 5, 20, 21, 30, 0); // 20 Jun 2026, 21:30 local

// --- tiny seeded RNG (mulberry32) -----------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260620);
const randInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)] as T;

// --- date helpers ----------------------------------------------------------
function at(daysAgo: number, hour: number, minute: number): Date {
  const d = new Date(BASE.getTime() - daysAgo * 86_400_000);
  d.setHours(hour, minute, 0, 0);
  return d;
}
const pad = (n: number) => String(n).padStart(2, "0");
function fmt(d: Date, sender: string, text: string): string {
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${date}, ${time} - ${sender}: ${text}`;
}

// --- message pools ---------------------------------------------------------
const POOLS: Record<string, { them: string[]; me: string[] }> = {
  Riya: {
    them: ["did you hear the new Prateek single?", "omg this reel 😂", "coffee tmrw?", "this song is SO you", "look what I found", "you free this weekend?", "send me that playlist na", "I'm obsessed with this album"],
    me: ["haha yes, on loop already", "100% down", "sending it now", "that's unreal", "just saw it lol", "let's do Saturday", "added you to the playlist", "same, can't stop"],
  },
  Vinay: {
    them: ["can you push the Vande Mataram cut tonight?", "client wants changes by morning", "BTS footage ready?", "need the release copy asap", "quick call?", "did the masters land?", "approve the artwork pls", "are we on for the recce?"],
    me: ["on it", "give me an hour", "sent the v2", "looping in the editor", "will share by tonight", "approved", "yes, 11am works", "uploading now"],
  },
  Amma: {
    them: ["beta did you eat?", "call me when you're free", "your cousin is asking about you", "send photos from the show", "are you sleeping on time?", "I made your favourite today", "when are you visiting?", "take care of your health"],
    me: ["haan Amma, just ate", "will call tonight", "tell them I said hi", "sending now", "yes yes, sleeping early", "miss your cooking", "soon, promise", "I will, don't worry"],
  },
  Karan: {
    them: ["bro practice this weekend?", "found a sick bassline", "gig on the 14th?", "you saw the football?", "lend me that pedal?", "studio open tmrw?", "new track idea", "we jamming or what"],
    me: ["yeah let's lock it", "send the tab", "I'm in", "what a match", "sure, pick it up", "after 6 works", "love it, let's try", "this weekend for sure"],
  },
  Sourav: {
    them: ["sharing the brief now", "deck looks good, minor edits", "can we sync at 3?", "budget approved", "great work on the launch", "client loved it", "invoice received", "let's plan next sprint"],
    me: ["thanks, reviewing", "will action those", "3pm works", "noted", "appreciate it", "glad to hear", "perfect", "sounds good"],
  },
};

// --- persona schedules -----------------------------------------------------
interface Persona {
  name: string;
  category: "work" | "personal";
  daysAgo: number[]; // session days
  nightShare: number; // chance a session is after-hours (22:00–23:59)
  replyGap: [number, number]; // my reply latency range (minutes)
  finalEndsWith: "me" | "them"; // who sends the last message overall
}

const PERSONAS: Persona[] = [
  { name: "Riya", category: "personal", daysAgo: [1, 3, 5, 8, 11, 14, 18, 22, 27, 33, 40, 48, 57, 67, 78, 88], nightShare: 0.15, replyGap: [1, 12], finalEndsWith: "me" },
  { name: "Vinay", category: "work", daysAgo: [2, 4, 6, 9, 13, 20, 30, 45, 62, 80], nightShare: 0.7, replyGap: [5, 40], finalEndsWith: "them" },
  { name: "Amma", category: "personal", daysAgo: [5, 30, 40, 47, 50, 53, 56, 59, 62, 65, 68, 71, 74, 77, 80, 83, 86, 89], nightShare: 0.2, replyGap: [30, 240], finalEndsWith: "them" },
  { name: "Karan", category: "personal", daysAgo: [4, 10, 16, 24, 34, 44, 55, 70, 85], nightShare: 0.1, replyGap: [600, 1100], finalEndsWith: "me" },
  { name: "Sourav", category: "work", daysAgo: [3, 7, 12, 17, 23, 29, 36, 43, 52, 63, 75, 86], nightShare: 0.0, replyGap: [10, 90], finalEndsWith: "me" },
];

function sessionHour(p: Persona): { hour: number; minute: number } {
  if (rng() < p.nightShare) return { hour: randInt(22, 23), minute: randInt(0, 59) };
  return { hour: randInt(9, 20), minute: randInt(0, 59) };
}

/** A WhatsApp-style system line (no "Name:" prefix). */
function systemLine(d: Date, text: string): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} - ${text}`;
}

function buildConversation(p: Persona): string {
  const pool = POOLS[p.name] as { them: string[]; me: string[] };
  const lines: string[] = [];
  const enc = at(p.daysAgo.at(-1) as number, 8, 59);
  lines.push(systemLine(enc, "Messages and calls are end-to-end encrypted. Tap to learn more."));

  // Oldest first.
  const days = [...p.daysAgo].sort((a, b) => b - a);
  days.forEach((daysAgo, idx) => {
    const isLast = idx === days.length - 1;
    const { hour, minute } = sessionHour(p);
    let turns = randInt(3, 6);
    let starter: "me" | "them" = rng() < 0.5 ? "me" : "them";

    if (isLast) {
      // Force who sends the final message of the whole thread.
      // parity: if starter === finalEndsWith, need odd turns; else even.
      const wantSameParity = starter === p.finalEndsWith;
      if (wantSameParity && turns % 2 === 0) turns += 1;
      if (!wantSameParity && turns % 2 === 1) turns += 1;
    }

    let cursor = at(daysAgo, hour, minute);
    for (let t = 0; t < turns; t++) {
      const who: "me" | "them" = t % 2 === 0 ? starter : starter === "me" ? "them" : "me";
      const text = who === "me" ? pick(pool.me) : pick(pool.them);
      const sender = who === "me" ? ME : p.name;
      lines.push(fmt(cursor, sender, text));
      // advance cursor for the next turn
      const gap = who === "them" ? randInt(p.replyGap[0], p.replyGap[1]) : randInt(1, 20);
      cursor = new Date(cursor.getTime() + gap * 60_000);
    }
  });

  return lines.join("\n") + "\n";
}

function buildGroup(): string {
  const members = ["Akhil", "Usha", "Vinay", "Priya"];
  const lines: string[] = [];
  const created = at(75, 11, 0);
  lines.push(systemLine(created, 'Akhil created group "DARPAN Crew"'));
  const pool = [
    "venue confirmed for the 14th",
    "who's bringing the projector?",
    "I'll handle the visuals",
    "press list is ready",
    "rehearsal at 4 tomorrow",
    "tickets are live!",
    "amazing show everyone 🙌",
    "sharing photos in a bit",
  ];
  const days = [70, 55, 40, 28, 18, 9, 3];
  for (const d of days) {
    const start = at(d, randInt(10, 21), randInt(0, 59));
    const turns = randInt(2, 4);
    let cursor = start;
    for (let t = 0; t < turns; t++) {
      const sender = pick(members);
      lines.push(fmt(cursor, sender, pick(pool)));
      cursor = new Date(cursor.getTime() + randInt(2, 90) * 60_000);
    }
  }
  return lines.join("\n") + "\n";
}

// --- write -----------------------------------------------------------------
const config = {
  me: ME,
  windowDays: 90,
  now: "latest",
  defaultCategory: "unknown",
  workHours: { start: 9, end: 18, days: [1, 2, 3, 4, 5] },
  contacts: PERSONAS.map((p) => ({ name: p.name, category: p.category })),
};

for (const p of PERSONAS) {
  writeFileSync(join(OUT_DIR, `WhatsApp Chat with ${p.name}.txt`), buildConversation(p), "utf8");
}
writeFileSync(join(OUT_DIR, "WhatsApp Chat with DARPAN Crew.txt"), buildGroup(), "utf8");
writeFileSync(join(import.meta.dir, "..", "fixtures", "comit.config.json"), JSON.stringify(config, null, 2) + "\n", "utf8");

console.log(`Wrote ${PERSONAS.length + 1} chat exports + comit.config.json to fixtures/`);
