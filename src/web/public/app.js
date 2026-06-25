// comit dashboard — vanilla JS, no dependencies, no external requests.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GRADE_COLOR = {
  thriving: "var(--thriving)",
  steady: "var(--steady)",
  cooling: "var(--cooling)",
  fading: "var(--fading)",
};
const NUDGE_ICON = {
  "reply-debt": "↩",
  drifting: "≀",
  boundary: "⚠",
  responsiveness: "⏱",
  rekindle: "✦",
};

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtHour = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;

async function loadReport() {
  // Live dashboard: the Bun server exposes /api/report.
  try {
    const res = await fetch("/api/report");
    if (res.ok) {
      const r = await res.json();
      if (!r.error) return r;
    }
  } catch {
    /* not running as a server — fall through to the static snapshot */
  }
  // Static hosting (e.g. GitHub Pages): a pre-rendered report.json sits beside this page.
  const res = await fetch("report.json");
  return res.json();
}

async function main() {
  let report;
  try {
    report = await loadReport();
    if (report.error) throw new Error(report.error);
  } catch (err) {
    document.getElementById("app").innerHTML = `<div class="loading">Could not load report: ${esc(
      err.message,
    )}</div>`;
    return;
  }
  render(report);
}

function render(r) {
  document.getElementById("meta").innerHTML = `
    <span class="pill">demo data</span>
    <span><b>${r.conversationCount}</b> conversations</span>
    <span><b>${r.messageCount}</b> messages</span>
    <span>as of <b>${r.referenceNow.slice(0, 10)}</b></span>`;

  const owed = r.replyDebts.filter((d) => d.owedBy === "me" && !d.isGroup);

  document.getElementById("app").innerHTML = `
    ${statRow(r, owed)}
    <div class="grid-2">
      <div>${nudgesPanel(r.nudges)}</div>
      <div>${contactsPanel(r.scores, owed)}</div>
    </div>
    ${balancePanel(r.balance)}
    ${momentumPanel(r.trends)}
  `;
}

function statRow(r, owed) {
  const top = [...r.scores].sort((a, b) => b.score - a.score)[0];
  const cards = [
    { num: r.conversationCount, lbl: "conversations tracked" },
    { num: owed.length, lbl: "replies you owe", color: owed.length ? "var(--cooling)" : "var(--thriving)" },
    {
      num: r.balance.afterHoursWork.count,
      lbl: "after-hours work pings",
      color: r.balance.afterHoursWork.count ? "var(--fading)" : "var(--thriving)",
    },
    { num: top ? `${top.score}` : "—", lbl: top ? `top bond · ${esc(top.contact)}` : "no data" },
  ];
  return `<div class="stats">${cards
    .map(
      (c) =>
        `<div class="stat"><div class="num" style="color:${c.color || "var(--text)"}">${c.num}</div><div class="lbl">${esc(
          c.lbl,
        )}</div></div>`,
    )
    .join("")}</div>`;
}

function nudgesPanel(nudges) {
  if (!nudges.length) {
    return `<section class="panel nudges"><h2>Nudges</h2><div class="empty"><span class="tick">✓✓</span> All clear — nothing nagging right now.</div></section>`;
  }
  const items = nudges
    .map((n) => {
      const msg = esc(n.message).replace(esc(n.contact), `<span class="who">${esc(n.contact)}</span>`);
      return `<div class="nudge k-${n.kind}">
        <div class="dot">${NUDGE_ICON[n.kind] || "•"}</div>
        <div class="body">${msg}</div>
      </div>`;
    })
    .join("");
  return `<section class="panel nudges"><h2>Nudges · what to do</h2>${items}</section>`;
}

function contactsPanel(scores, owed) {
  const owedSet = new Map(owed.map((d) => [d.contact, d.waitingHuman]));
  const cards = scores
    .map((s) => {
      const catClass = s.isGroup ? "group" : s.category;
      const catLabel = s.isGroup ? "group" : s.category;
      const last = s.stats.lastContactDays < 1 ? "today" : `${Math.round(s.stats.lastContactDays)}d ago`;
      const oweLine = owedSet.has(s.contact)
        ? `<div class="oweline">↩ owe a reply · ${esc(owedSet.get(s.contact))}</div>`
        : "";
      return `<div class="contact">
        ${ring(s.score, s.grade)}
        <div class="cbody">
          <div class="name">${esc(s.contact)}</div>
          <div class="sub">${esc(s.grade)} · last ${last}</div>
          <div class="sub">${s.stats.sent}↑ / ${s.stats.received}↓ &nbsp; <span class="chip ${catClass}">${esc(
            catLabel,
          )}</span></div>
          ${oweLine}
        </div>
      </div>`;
    })
    .join("");
  return `<section class="panel"><h2>Relationships · interaction score</h2><div class="contacts">${cards}</div></section>`;
}

function ring(score, grade) {
  const r = 26;
  const C = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * C;
  const color = GRADE_COLOR[grade] || "var(--accent)";
  return `<svg class="ring" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--border)" stroke-width="6"/>
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/>
    <text x="32" y="37" text-anchor="middle" font-size="16" font-weight="800" fill="var(--text)">${Math.round(
      score,
    )}</text>
  </svg>`;
}

function balancePanel(b) {
  const max = Math.max(1, ...b.byWeekday);
  const bars = b.byWeekday
    .map(
      (n, i) =>
        `<div class="col"><div class="fill" style="height:${(n / max) * 100}%"></div><div class="day">${
          WEEKDAYS[i]
        }</div></div>`,
    )
    .join("");
  const workPct = Math.round(b.workShare * 100);
  return `<section class="panel"><h2>Work-life balance</h2>
    <div class="balance-grid">
      <div style="text-align:center">
        ${donut(b.workShare)}
        <div class="legend" style="justify-content:center">
          <span><i style="background:var(--work)"></i>Work ${workPct}%</span>
          <span><i style="background:var(--personal)"></i>Personal ${100 - workPct}%</span>
        </div>
      </div>
      <div>
        <div class="weekbars">${bars}</div>
        <div class="legend">
          <span><span class="bignum" style="color:var(--fading)">${b.afterHoursWork.count}</span> after-hours work pings (${Math.round(
            b.afterHoursWork.share * 100,
          )}% of work chatter)</span>
          <span>busiest at <b style="color:var(--text)">${fmtHour(b.busiestHour)}</b></span>
        </div>
      </div>
    </div>
  </section>`;
}

function donut(workShare) {
  const r = 42;
  const C = 2 * Math.PI * r;
  const work = workShare * C;
  return `<svg viewBox="0 0 110 110" width="130" height="130">
    <circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--personal)" stroke-width="14"/>
    <circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--work)" stroke-width="14"
      stroke-dasharray="${work.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 55 55)"/>
    <text x="55" y="52" text-anchor="middle" font-size="20" font-weight="800" fill="var(--text)">${Math.round(
      workShare * 100,
    )}%</text>
    <text x="55" y="70" text-anchor="middle" font-size="11" fill="var(--muted)">work</text>
  </svg>`;
}

function momentumPanel(trends) {
  const moving = trends.filter((t) => t.direction !== "steady").slice(0, 8);
  if (!moving.length) return "";
  const rows = moving
    .map((t) => {
      const pct = `${t.changePct >= 0 ? "+" : ""}${Math.round(t.changePct * 100)}%`;
      const cls = t.direction === "rising" ? "rise" : "fall";
      const arrow = t.direction === "rising" ? "▲" : "▼";
      return `<div class="mom">
        <span><span class="${cls}">${arrow} ${esc(t.contact)}</span></span>
        <span class="dim">${t.priorPerWeek}/wk → ${t.recentPerWeek}/wk</span>
        <span class="${cls}">${pct}</span>
      </div>`;
    })
    .join("");
  return `<section class="panel"><h2>Momentum · who's rising & fading</h2>${rows}</section>`;
}

main();
