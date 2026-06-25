// Builds presentation/comit.pptx — a PowerPoint mirror of the reveal-style deck.
//
//   npm install pptxgenjs
//   node presentation/build-pptx.mjs
//
// Kept in the repo for reproducibility; node_modules is git-ignored.
import pptxgen from "pptxgenjs";

const C = {
  bg: "0D0D12",
  card: "181823",
  card2: "11111A",
  border: "2A2A3A",
  text: "ECECF4",
  muted: "9A9AB4",
  dim: "6B6B85",
  accent: "B14DFF",
  accent2: "45D0D0",
  green: "46D398",
  cyan: "45D0D0",
  amber: "FFB454",
  blue: "6AA8FF",
  purple: "D27DFF",
  hot: "FF7AA8",
  red: "FF5D6C",
};
const SANS = "Calibri";
const MONO = "Courier New";

const pptx = new pptxgen();
pptx.defineLayout({ name: "W", width: 13.33, height: 7.5 });
pptx.layout = "W";
pptx.author = "Akhil Tripathi";
pptx.title = "comit";

const slide = () => {
  const s = pptx.addSlide();
  s.background = { color: C.bg };
  return s;
};

// two-tone wordmark
function wordmark(s, { x, y, size }) {
  s.addText(
    [
      { text: "com", options: { color: C.accent } },
      { text: "it", options: { color: C.accent2 } },
    ],
    { x, y, w: 8, h: size / 50, fontFace: SANS, fontSize: size, bold: true, charSpacing: -1 },
  );
}

// a score-ring motif: outer ring + number
function ring(s, { x, y, d, color, num }) {
  s.addShape(pptx.ShapeType.ellipse, {
    x,
    y,
    w: d,
    h: d,
    fill: { type: "solid", color: C.bg },
    line: { color, width: 4 },
  });
  s.addText(String(num), {
    x,
    y,
    w: d,
    h: d,
    align: "center",
    valign: "middle",
    color: C.text,
    fontFace: SANS,
    fontSize: 14,
    bold: true,
  });
}

function title(s, text) {
  s.addText(text, {
    x: 0.7,
    y: 0.55,
    w: 12,
    h: 0.9,
    fontFace: SANS,
    fontSize: 38,
    bold: true,
    color: C.text,
    charSpacing: -0.5,
  });
}

function note(s, text) {
  s.addText(text, {
    x: 0.7,
    y: 6.55,
    w: 12,
    h: 0.6,
    fontFace: SANS,
    fontSize: 14,
    color: C.muted,
  });
}

// ---- Slide 1: title ----
{
  const s = slide();
  s.addText("OPEN-SOURCE  ·  PRIVACY-FIRST", {
    x: 0.7,
    y: 1.5,
    w: 8,
    h: 0.4,
    fontFace: SANS,
    fontSize: 13,
    color: C.accent2,
    charSpacing: 3,
  });
  wordmark(s, { x: 0.62, y: 1.95, size: 96 });
  s.addText("commit to the people who matter", {
    x: 0.7,
    y: 3.5,
    w: 11,
    h: 0.7,
    fontFace: SANS,
    fontSize: 30,
    color: C.text,
  });
  s.addText(
    "A work-life-balance companion for WhatsApp — interaction scores, reply-debt tracking and gentle nudges, computed entirely on your device.",
    { x: 0.7, y: 4.35, w: 8, h: 0.9, fontFace: SANS, fontSize: 16, color: C.muted },
  );
  ring(s, { x: 9.5, y: 1.9, d: 1.1, color: C.green, num: 84 });
  ring(s, { x: 10.85, y: 2.5, d: 0.9, color: C.cyan, num: 70 });
  ring(s, { x: 10.5, y: 3.7, d: 0.8, color: C.amber, num: 48 });
  s.addText("Akhil Tripathi  ·  MIT licensed", {
    x: 0.7,
    y: 5.6,
    w: 8,
    h: 0.4,
    fontFace: SANS,
    fontSize: 14,
    color: C.dim,
  });
}

// ---- Slide 2: the gap ----
{
  const s = slide();
  title(s, "The gap");
  s.addText(
    [
      { text: "Messaging apps track what's ", options: { color: C.text } },
      { text: "unread", options: { color: C.dim } },
      { text: ".\nThey say nothing about what's ", options: { color: C.text } },
      { text: "unreplied", options: { color: C.hot } },
      { text: ".", options: { color: C.text } },
    ],
    { x: 0.7, y: 1.7, w: 11.8, h: 1.6, fontFace: SANS, fontSize: 30, bold: true, lineSpacingMultiple: 1.2 },
  );
  const items = [
    "The friend you used to text weekly, now silent for two months.",
    "The reply you've owed your mother for three days.",
    "Work chatter that quietly took over your evenings.",
  ];
  items.forEach((t, i) => {
    s.addText("✦", { x: 0.7, y: 3.6 + i * 0.65, w: 0.4, h: 0.5, color: C.accent, fontFace: SANS, fontSize: 18 });
    s.addText(t, { x: 1.15, y: 3.6 + i * 0.65, w: 11, h: 0.5, color: C.text, fontFace: SANS, fontSize: 19 });
  });
  note(s, "We drift, and we don't notice until it's a pattern.");
}

// ---- Slide 3: what comit does ----
{
  const s = slide();
  title(s, "What comit does");
  const cards = [
    { c: C.green, h: "Interaction Score", d: "A transparent 0–100 health score per contact: recency, frequency, reciprocity, responsiveness, who-starts." },
    { c: C.amber, h: "Reply Debt", d: "Who you owe a reply, and for how long. “Amma, 3 days.”" },
    { c: C.blue, h: "Work-Life Balance", d: "Work vs personal split, after-hours work, your late-night pingers." },
    { c: C.purple, h: "Momentum", d: "Who's heating up, who's going quiet — before it's too late." },
    { c: C.cyan, h: "Nudges", d: "One ranked, plain-language to-do list that ties it all together." },
  ];
  const cw = 3.9, ch = 2.15, gx = 0.27, gy = 0.3, x0 = 0.7, y0 = 1.65;
  cards.forEach((card, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (cw + gx), y = y0 + row * (ch + gy);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.12, fill: { color: C.card }, line: { color: C.border, width: 1 } });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.3, y: y + 0.3, w: 0.34, h: 0.34, fill: { color: card.c }, line: { color: card.c } });
    s.addText(card.h, { x: x + 0.3, y: y + 0.75, w: cw - 0.6, h: 0.4, color: C.text, fontFace: SANS, fontSize: 17, bold: true });
    s.addText(card.d, { x: x + 0.3, y: y + 1.18, w: cw - 0.6, h: 0.85, color: C.muted, fontFace: SANS, fontSize: 13 });
  });
}

// ---- Slide 4: it just runs ----
{
  const s = slide();
  title(s, "It just runs");
  s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.6, w: 11.9, h: 4.6, rectRadius: 0.1, fill: { color: C.card2 }, line: { color: C.border, width: 1 } });
  s.addText(
    [
      { text: "$ bun run demo\n\n", options: { color: C.dim } },
      { text: "comit", options: { color: C.accent, bold: true } },
      { text: "  ·  6 conversations · 321 messages · 90-day window\n\n", options: { color: C.text } },
      { text: "-- nudges --------------------------------------------\n", options: { color: "3A3A52" } },
      { text: "!  ", options: { color: C.red } },
      { text: "Vinay (work) reached you after hours 44x recently.\n", options: { color: C.text } },
      { text: "<  ", options: { color: C.amber } },
      { text: "You owe Amma a reply - waiting 3 days.\n", options: { color: C.text } },
      { text: "~  ", options: { color: C.blue } },
      { text: "Amma is cooling off: ~10.9/wk -> ~2.0/wk. Reach out?\n", options: { color: C.text } },
      { text: "@  ", options: { color: C.cyan } },
      { text: "Your replies to Karan take ~15h on average.\n\n", options: { color: C.text } },
      { text: "-- balance -------------------------------------------\n", options: { color: "3A3A52" } },
      { text: "work vs personal   ", options: { color: C.text } },
      { text: "######", options: { color: C.accent } },
      { text: "------------ 35% work\n", options: { color: C.dim } },
      { text: "after-hours work   ", options: { color: C.text } },
      { text: "66", options: { color: C.red, bold: true } },
      { text: " messages (64% of work chatter)", options: { color: C.text } },
    ],
    { x: 1.0, y: 1.85, w: 11.3, h: 4.1, fontFace: MONO, fontSize: 13.5, lineSpacingMultiple: 1.12, valign: "top" },
  );
  note(s, "…or open the offline dashboard with  bun run web.");
}

// ---- Slide 5: transparent ----
{
  const s = slide();
  title(s, "Transparent by design");
  s.addText("No black boxes. The interaction score is a documented, tunable formula:", {
    x: 0.7, y: 1.6, w: 11, h: 0.5, color: C.muted, fontFace: SANS, fontSize: 18,
  });
  s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 2.4, w: 11.9, h: 2.6, rectRadius: 0.1, fill: { color: C.card2 }, line: { color: C.border, width: 1 } });
  s.addText(
    [
      { text: "score = 100 × (  ", options: { color: C.text } },
      { text: "0.30·recency\n", options: { color: C.green } },
      { text: "                 + ", options: { color: C.text } },
      { text: "0.25·frequency\n", options: { color: C.cyan } },
      { text: "                 + ", options: { color: C.text } },
      { text: "0.20·reciprocity\n", options: { color: C.purple } },
      { text: "                 + ", options: { color: C.text } },
      { text: "0.15·responsiveness\n", options: { color: C.blue } },
      { text: "                 + ", options: { color: C.text } },
      { text: "0.10·initiation", options: { color: C.amber } },
      { text: "  )", options: { color: C.text } },
    ],
    { x: 1.0, y: 2.75, w: 11.3, h: 2.0, fontFace: MONO, fontSize: 17, lineSpacingMultiple: 1.15, valign: "top" },
  );
  note(s, "Every constant is exported and overridable. Change one, re-run the tests, see exactly what moves.");
}

// ---- Slide 6: privacy ----
{
  const s = slide();
  title(s, "The part that matters most");
  s.addText(
    [
      { text: "Your messages ", options: { color: C.text } },
      { text: "never leave your device.", options: { color: C.hot } },
    ],
    { x: 0.7, y: 1.9, w: 12, h: 0.9, fontFace: SANS, fontSize: 36, bold: true },
  );
  const pills = ["100% offline", "no accounts", "no servers", "no telemetry", "zero runtime deps", "reads only, never writes your chats"];
  let px = 0.7, py = 3.2;
  pills.forEach((t) => {
    const w = 0.5 + t.length * 0.115;
    if (px + w > 12.6) { px = 0.7; py += 0.75; }
    s.addShape(pptx.ShapeType.roundRect, { x: px, y: py, w, h: 0.55, rectRadius: 0.27, fill: { color: C.card }, line: { color: C.border, width: 1 } });
    s.addText(t, { x: px, y: py, w, h: 0.55, align: "center", valign: "middle", color: C.text, fontFace: SANS, fontSize: 14 });
    px += w + 0.25;
  });
  s.addText(
    [
      { text: "comit makes ", options: { color: C.muted } },
      { text: "no network requests at all", options: { color: C.text, bold: true } },
      { text: " — even the dashboard's fonts and charts are self-hosted. Auditable in an afternoon.", options: { color: C.muted } },
    ],
    { x: 0.7, y: 5.4, w: 12, h: 0.8, fontFace: SANS, fontSize: 16 },
  );
}

// ---- Slide 7: architecture ----
{
  const s = slide();
  title(s, "How it's built");
  s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.6, w: 11.9, h: 3.9, rectRadius: 0.1, fill: { color: C.card2 }, line: { color: C.border, width: 1 } });
  s.addText(
    [
      { text: "  WhatsApp .txt export\n          |\n          v\n", options: { color: C.muted } },
      { text: "   +--------------+   pure, deterministic   +------------------------+\n", options: { color: C.dim } },
      { text: "   | DataSource   | ----------------------> |  analytics engine      |\n", options: { color: C.text } },
      { text: "   | export parser|   (no I/O, no clock)    |  score.debt.balance    |\n", options: { color: C.text } },
      { text: "   +--------------+                         |  .trends.nudges        |\n", options: { color: C.dim } },
      { text: "          ^                                 +-----------+------------+\n", options: { color: C.dim } },
      { text: "   future: live                          +--------------+-----------+\n", options: { color: C.accent2 } },
      { text: "   Baileys adapter                       v                          v\n", options: { color: C.accent2 } },
      { text: "                                      CLI report               Dashboard", options: { color: C.text } },
    ],
    { x: 1.0, y: 1.9, w: 11.3, h: 3.3, fontFace: MONO, fontSize: 13, lineSpacingMultiple: 1.1, valign: "top" },
  );
  note(s, "One pure core. One I/O seam. A live data source could plug in without touching a line of analytics.");
}

// ---- Slide 8: engineering ----
{
  const s = slide();
  title(s, "The engineering");
  const stats = [
    { n: "0", l: "runtime dependencies" },
    { n: "28", l: "passing tests" },
    { n: "5", l: "composable analytics" },
    { n: "2", l: "interfaces (CLI + web)" },
  ];
  const cw = 2.85, gx = 0.3, x0 = 0.7, y = 1.65, ch = 1.7;
  stats.forEach((st, i) => {
    const x = x0 + i * (cw + gx);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.12, fill: { color: C.card }, line: { color: C.border, width: 1 } });
    s.addText(st.n, { x, y: y + 0.2, w: cw, h: 0.9, align: "center", color: C.accent, fontFace: SANS, fontSize: 46, bold: true });
    s.addText(st.l, { x, y: y + 1.12, w: cw, h: 0.45, align: "center", color: C.muted, fontFace: SANS, fontSize: 13 });
  });
  const bullets = [
    "TypeScript, strict mode, runs on Bun with no build step.",
    "Pure core → fast, deterministic, exhaustively testable.",
    "Clean adapter interface for new sources (Telegram, Signal, iMessage).",
    "CI, docs, and a deterministic synthetic-data generator.",
  ];
  bullets.forEach((t, i) => {
    s.addText("✦", { x: 0.7, y: 3.9 + i * 0.62, w: 0.4, h: 0.5, color: C.accent, fontFace: SANS, fontSize: 16 });
    s.addText(t, { x: 1.15, y: 3.9 + i * 0.62, w: 11, h: 0.5, color: C.text, fontFace: SANS, fontSize: 17 });
  });
}

// ---- Slide 9: roadmap ----
{
  const s = slide();
  title(s, "Where it goes");
  const bullets = [
    ["More importers", " — Telegram, Signal, iMessage, each just a new DataSource."],
    ["Opt-in live source", " via Baileys — clearly flagged, never a default, because privacy-first means the user makes that call."],
    ["Weekly digest", " and a per-contact deep-dive in the dashboard."],
    ["Configurable", " scoring weights and nudge rules."],
  ];
  bullets.forEach((b, i) => {
    s.addText("✦", { x: 0.7, y: 1.9 + i * 0.95, w: 0.4, h: 0.5, color: C.accent, fontFace: SANS, fontSize: 18 });
    s.addText(
      [
        { text: b[0], options: { color: C.text, bold: true } },
        { text: b[1], options: { color: C.muted } },
      ],
      { x: 1.15, y: 1.9 + i * 0.95, w: 11.3, h: 0.85, fontFace: SANS, fontSize: 18 },
    );
  });
  note(s, "Built to be forked. Good first issues are tagged.");
}

// ---- Slide 10: closing ----
{
  const s = slide();
  wordmark(s, { x: 0.62, y: 2.2, size: 96 });
  s.addText("commit to the people who matter", { x: 0.7, y: 3.75, w: 11, h: 0.7, fontFace: SANS, fontSize: 28, color: C.text });
  s.addText("github.com/takhil/comit  ·  MIT", { x: 0.7, y: 4.5, w: 11, h: 0.5, fontFace: SANS, fontSize: 18, color: C.accent2 });
  s.addText("A small daily commit — to your relationships, and your off-hours.", { x: 0.7, y: 5.2, w: 11, h: 0.5, fontFace: SANS, fontSize: 15, color: C.dim });
}

await pptx.writeFile({ fileName: process.env.PPTX_OUT || "presentation/comit.pptx" });
console.log("wrote", process.env.PPTX_OUT || "presentation/comit.pptx");
