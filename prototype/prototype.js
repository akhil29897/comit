// comit iPhone 15 prototype — self-contained, zero dependencies.
// Demo data mirrors `bun run demo`.

const C = { thriving: "#25d366", steady: "#128c7e" };

/* ---- icons ---- */
const ICON = {
  signal: `<svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`,
  wifi: `<svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="#fff" stroke-width="1.5"><path d="M1 3.3a11 11 0 0 1 15 0"/><path d="M3.6 6a7 7 0 0 1 9.8 0"/><path d="M6.2 8.6a3.5 3.5 0 0 1 4.6 0"/></svg><svg width="3" height="3" viewBox="0 0 3 3" style="margin-left:-9px"><circle cx="1.5" cy="1.5" r="1.3" fill="#fff"/></svg>`,
  battery: `<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="#fff" opacity="0.55"/><rect x="2.2" y="2.2" width="18.6" height="8.6" rx="1.8" fill="#fff"/><path d="M24.5 4.2v4.6c1 -0.4 1 -4.2 0 -4.6Z" fill="#fff" opacity="0.55"/></svg>`,
  search: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>`,
  menu: `<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
  today: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l2.3 5 5.2.6-3.9 3.5 1.1 5.1L12 14.9 7.3 17.3l1.1-5.1L4.5 8.6l5.2-.6z"/></svg>`,
  people: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.3"/><path d="M3.3 19.2a5.7 5.7 0 0 1 11.4 0"/><path d="M16.2 5.1a3.2 3.2 0 0 1 0 5.9"/><path d="M17.8 13.4a5.7 5.7 0 0 1 2.9 5"/></svg>`,
  balance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/></svg>`,
};

function statusbar() {
  return `<div class="statusbar"><div class="time">9:41</div><div class="sb">${ICON.signal}${ICON.wifi}${ICON.battery}</div></div>`;
}

function tabbar(active) {
  const tabs = [
    ["today", "Today"],
    ["people", "People"],
    ["balance", "Balance"],
  ];
  return `<nav class="tabbar">${tabs
    .map(
      ([k, l]) =>
        `<div class="tab ${k === active ? "active" : ""}">${ICON[k]}<span>${l}</span></div>`,
    )
    .join("")}</nav>`;
}

function header(title, sub, acts = true) {
  return `<div class="appheader">${statusbar()}<div class="titlerow">
    <div class="ttl"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}</div>
    ${acts ? `<div class="acts">${ICON.search}${ICON.menu}</div>` : ""}
  </div></div>`;
}

function ring(score, color, size) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const m = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:0 0 ${size}px">
    <circle cx="${m}" cy="${m}" r="${r}" fill="#fff" stroke="#e7e1d8" stroke-width="4"/>
    <circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${m} ${m})"/>
    <text x="${m}" y="${m + size * 0.11}" text-anchor="middle" font-size="${(size * 0.32).toFixed(
      0,
    )}" font-weight="800" fill="#111b21" font-family="system-ui">${score}</text>
  </svg>`;
}

function donut(ws) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const w = ws * c;
  return `<svg width="150" height="150" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#25d366" stroke-width="15"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#34b7f1" stroke-width="15"
      stroke-dasharray="${w.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/>
    <text x="60" y="56" text-anchor="middle" font-size="26" font-weight="800" fill="#111b21" font-family="system-ui">${Math.round(
      ws * 100,
    )}%</text>
    <text x="60" y="76" text-anchor="middle" font-size="12" fill="#667781" font-family="system-ui">work</text>
  </svg>`;
}

function bubble(cls, icon, html, time) {
  return `<div class="bubble"><div class="dot ${cls}">${icon}</div><div><div class="txt">${html}</div><div class="time">${time}</div></div></div>`;
}

/* ---------- screens ---------- */
function splashScreen() {
  return `<div class="screen" style="background:linear-gradient(170deg,#075e54,#128c7e 60%,#25d366)">
    ${statusbar()}
    <div class="splash">
      <div class="logo"><span class="mk">✦</span>comit</div>
      <div class="tg">commit to the people who matter</div>
      <div class="foot">private · offline · yours<b>your messages never leave your phone</b></div>
    </div>
  </div>`;
}

function todayScreen() {
  const nudges =
    bubble("d-red", "!", "<b>Vinay</b> (work) reached you after hours 44× recently. Consider muting.", "9:41") +
    bubble("d-amber", "↩", "You owe <b>Amma</b> a reply — waiting 3 days. “your cousin is asking about you”", "9:41") +
    bubble("d-blue", "≀", "<b>Amma</b> is cooling off: ~10.9/wk → ~2.0/wk. Reach out?", "9:41") +
    bubble("d-green", "⏱", "Your replies to <b>Karan</b> take ~15h on average.", "9:41");
  const content = `
    <div class="greet">Tuesday morning · <b>here's your day</b></div>
    <div class="sumrow">
      <div class="sumcard"><div class="n" style="color:#f4a300">2</div><div class="l">replies you owe</div></div>
      <div class="sumcard"><div class="n" style="color:#ea4335">66</div><div class="l">after-hours pings</div></div>
      <div class="sumcard"><div class="n" style="color:#008069">35%</div><div class="l">work load</div></div>
    </div>
    <div class="section-label">Nudges · what to do</div>
    ${nudges}`;
  return `<div class="screen">${header("comit", "", true)}<div class="content">${content}</div>${tabbar("today")}</div>`;
}

function peopleScreen() {
  const people = [
    { n: "Riya", s: 84, g: "thriving", cat: "personal", ms: "thriving · last today · 38↑ 36↓" },
    { n: "Vinay", s: 79, g: "thriving", cat: "work", ms: "thriving · last today · 25↑ 24↓", owe: "owe 13h" },
    { n: "Sourav", s: 71, g: "thriving", cat: "work", ms: "thriving · last 2d ago · 29↑ 26↓" },
    { n: "Amma", s: 70, g: "steady", cat: "personal", ms: "steady · last 4d ago · 44↑ 39↓", owe: "owe 3d" },
    { n: "Karan", s: 58, g: "steady", cat: "personal", ms: "steady · last 2d ago · 19↑ 20↓" },
    { n: "DARPAN Crew", s: 48, g: "steady", cat: "group", ms: "steady · last 2d ago · 6↑ 15↓" },
  ];
  const rows = people
    .map(
      (p) => `<div class="row">
      ${ring(p.s, C[p.g], 52)}
      <div class="meta">
        <div class="nm">${p.n} <span class="chip ${p.cat}">${p.cat}</span></div>
        <div class="ms">${p.ms}</div>
      </div>
      <div class="rt">${p.owe ? `<span class="badge">${p.owe}</span>` : ""}</div>
    </div>`,
    )
    .join("");
  const content = `<div class="section-label">Relationships · by interaction score</div><div class="list">${rows}</div>`;
  return `<div class="screen">${header("People", "", true)}<div class="content">${content}</div>${tabbar("people")}</div>`;
}

function balanceScreen() {
  const heights = [70, 76, 50, 72, 66, 76, 38];
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const max = Math.max(...heights);
  const bars = heights
    .map(
      (h, i) =>
        `<div class="col"><div class="fl" style="height:${(h / max) * 100}%"></div><div class="dy">${days[i]}</div></div>`,
    )
    .join("");
  const content = `
    <div class="card donut-wrap">
      ${donut(0.35)}
      <div class="legend"><span><i style="background:#34b7f1"></i>Work 35%</span><span><i style="background:#25d366"></i>Personal 65%</span></div>
    </div>
    <div class="card ah"><div class="big">66</div><div class="l">after-hours work pings<br><span style="color:#8696a0">64% of your work chatter, outside working hours</span></div></div>
    <div class="card">
      <div class="section-label" style="margin:0 0 8px">By weekday · busiest 11 PM</div>
      <div class="weekbars">${bars}</div>
    </div>
    <div class="card">
      <div class="section-label" style="margin:0 0 4px">Momentum</div>
      <div class="mom"><span class="up">▲ Vinay</span><span class="c">1.4 → 6.2 /wk</span><span class="up">+344%</span></div>
      <div class="mom"><span class="up">▲ Riya</span><span class="c">3.7 → 7.8 /wk</span><span class="up">+108%</span></div>
      <div class="mom"><span class="dn">▼ Amma</span><span class="c">10.9 → 2.0 /wk</span><span class="dn">−81%</span></div>
    </div>`;
  return `<div class="screen">${header("Balance", "", true)}<div class="content">${content}</div>${tabbar("balance")}</div>`;
}

/* ---------- mount ---------- */
function device(screenHTML) {
  return `<div class="device"><div class="island"></div>${screenHTML}<div class="home"></div></div>`;
}
function frame(screenHTML, caption) {
  return `<div class="frame">${device(screenHTML)}<div class="caption">${caption}</div></div>`;
}

document.getElementById("stage").innerHTML = [
  frame(splashScreen(), "Launch"),
  frame(todayScreen(), "Today · nudges"),
  frame(peopleScreen(), "People · scores"),
  frame(balanceScreen(), "Balance · work-life"),
].join("");
