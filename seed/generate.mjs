// Jarvis seed generator — deterministic synthetic week for one persona.
// Top-down: the narrative is authored here; activity/artifact streams are derived.
// No deps, no external calls. Run: `node seed/generate.mjs`
//
// The camera stream (activities) carries ONLY a coarse label — it does not know
// which project a work block served. The project signal lives in artifacts, and
// reconciliation infers the link (Working block + artifact PRODUCED_IN project
// that day = the intention counted). This mirrors the real perception contract.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "output");

// --- The world -------------------------------------------------------------
const goals = [
  { id: "g_thesis", title: "Ship thesis draft", priority: 1 }, // stated #1 priority
  { id: "g_side", title: "Launch side project", priority: 2 },
  { id: "g_fit", title: "Get fit", priority: 3 },
];
const projects = [
  { id: "p_thesis", title: "Thesis", goalId: "g_thesis" },
  { id: "p_side", title: "Side project (Jarvis)", goalId: "g_side" },
  { id: "p_fit", title: "Fitness", goalId: "g_fit" },
  { id: "p_admin", title: "Admin / life", goalId: null },
];

// Mon 2026-06-29 .. Sun 2026-07-05 (local wall-clock, naive ISO).
const DAYS = [
  "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02",
  "2026-07-03", "2026-07-04", "2026-07-05",
];
const ts = (d, hhmm) => `${DAYS[d]}T${hhmm}:00`;

// Authored week. `w(proj)` tags a Working span's true project FOR AUTHORING ONLY;
// it is stripped from the emitted activity (perception can't know it).
const WEEK = [
  // Day 0 — Mon: a good day, thesis actually advances.
  {
    intentions: [
      { title: "Deep work: thesis ch3", planStart: "09:00", planEnd: "12:00", projectId: "p_thesis" },
      { title: "Gym", planStart: "17:00", planEnd: "18:00", projectId: "p_fit" },
    ],
    activities: [
      ["Sleeping", "00:00", "07:00", 0.95],
      ["Personal care", "07:00", "07:40", 0.8],
      ["Eating", "07:40", "08:10", 0.85],
      ["Working", "09:05", "11:50", 0.9],
      ["Eating", "12:00", "12:40", 0.85],
      ["Working", "13:15", "16:30", 0.88],
      ["Exercising", "17:05", "18:00", 0.92],
      ["Eating", "18:30", "19:10", 0.85],
      ["Leisure", "20:00", "22:45", 0.8],
      ["Sleeping", "23:00", "23:59", 0.95],
    ],
    artifacts: [
      ["commit", "thesis: draft ch3 intro", "11:35", "p_thesis"],
      ["task", "Outline ch3 sections", "11:48", "p_thesis"],
      ["commit", "jarvis: seed generator", "16:10", "p_side"],
    ],
  },
  // Day 1 — Tue: HERO 1. Intended 3h thesis; present but ZERO thesis output.
  {
    intentions: [
      { title: "Deep work: thesis ch3", planStart: "09:00", planEnd: "12:00", projectId: "p_thesis" },
    ],
    activities: [
      ["Sleeping", "00:00", "07:30", 0.95],
      ["Personal care", "07:30", "08:00", 0.8],
      ["Eating", "08:00", "08:30", 0.85],
      ["Working", "09:10", "10:30", 0.72], // at the desk...
      ["Leisure", "10:30", "11:20", 0.78], // ...then the phone
      ["Away", "11:20", "12:40", 0.9],
      ["Eating", "12:40", "13:20", 0.85],
      ["Leisure", "13:30", "16:00", 0.82],
      ["Working", "16:15", "17:30", 0.86],
      ["Leisure", "19:00", "23:00", 0.8],
      ["Sleeping", "23:15", "23:59", 0.95],
    ],
    artifacts: [
      ["commit", "jarvis: camera capture", "17:10", "p_side"], // no thesis artifact
    ],
  },
  // Day 2 — Wed: side-project heavy; thesis review intended but skipped.
  {
    intentions: [
      { title: "Side project sprint", planStart: "10:00", planEnd: "13:00", projectId: "p_side" },
      { title: "Thesis review", planStart: "15:00", planEnd: "16:00", projectId: "p_thesis" },
    ],
    activities: [
      ["Sleeping", "00:00", "07:15", 0.95],
      ["Personal care", "07:15", "07:45", 0.8],
      ["Eating", "07:45", "08:15", 0.85],
      ["Working", "09:30", "13:10", 0.9],
      ["Eating", "13:15", "13:50", 0.85],
      ["Working", "14:00", "17:45", 0.9],
      ["Chores", "18:30", "19:15", 0.75],
      ["Eating", "19:15", "19:50", 0.85],
      ["Leisure", "20:30", "23:00", 0.8],
      ["Sleeping", "23:10", "23:59", 0.95],
    ],
    artifacts: [
      ["commit", "jarvis: neo4j loader", "12:40", "p_side"],
      ["commit", "jarvis: graph queries", "16:20", "p_side"],
      ["commit", "jarvis: pipeline stub", "17:30", "p_side"], // thesis review never happened
    ],
  },
  // Day 3 — Thu: thesis attempted briefly (present, no output), fitness done.
  {
    intentions: [
      { title: "Deep work: thesis", planStart: "09:00", planEnd: "11:00", projectId: "p_thesis" },
      { title: "Gym", planStart: "17:30", planEnd: "18:30", projectId: "p_fit" },
    ],
    activities: [
      ["Sleeping", "00:00", "07:00", 0.95],
      ["Personal care", "07:00", "07:30", 0.8],
      ["Eating", "07:30", "08:00", 0.85],
      ["Working", "09:00", "10:15", 0.7], // thesis attempt, nothing shipped
      ["Chores", "10:30", "12:00", 0.75],
      ["Eating", "12:15", "12:50", 0.85],
      ["Working", "13:30", "16:45", 0.88],
      ["Exercising", "17:35", "18:35", 0.92],
      ["Eating", "19:00", "19:40", 0.85],
      ["Leisure", "20:30", "23:00", 0.8],
      ["Sleeping", "23:15", "23:59", 0.95],
    ],
    artifacts: [
      ["commit", "jarvis: frontend timeline", "16:30", "p_side"], // no thesis artifact
    ],
  },
  // Day 4 — Fri: HERO 3 becomes visible — thesis untouched since Mon (4 days).
  {
    intentions: [
      { title: "Deep work: thesis ch4", planStart: "09:00", planEnd: "12:00", projectId: "p_thesis" },
    ],
    activities: [
      ["Sleeping", "00:00", "07:20", 0.95],
      ["Personal care", "07:20", "07:50", 0.8],
      ["Eating", "07:50", "08:20", 0.85],
      ["Working", "09:20", "11:45", 0.9], // side project, not thesis
      ["Eating", "12:00", "12:40", 0.85],
      ["Working", "13:00", "15:30", 0.88],
      ["Leisure", "16:00", "18:00", 0.82],
      ["Eating", "18:30", "19:10", 0.85],
      ["Leisure", "20:00", "23:30", 0.8],
      ["Sleeping", "23:40", "23:59", 0.95],
    ],
    artifacts: [
      ["commit", "jarvis: graph viz", "11:30", "p_side"],
      ["commit", "jarvis: insight panel", "15:10", "p_side"],
    ],
  },
  // Day 5 — Sat: rest; a fulfilled fitness intention (activity matches, no artifact needed).
  {
    intentions: [
      { title: "Long run", planStart: "09:00", planEnd: "10:00", projectId: "p_fit" },
    ],
    activities: [
      ["Sleeping", "00:00", "08:30", 0.95],
      ["Personal care", "08:30", "09:00", 0.8],
      ["Exercising", "09:10", "10:05", 0.92],
      ["Eating", "10:30", "11:15", 0.85],
      ["Chores", "11:30", "13:00", 0.75],
      ["Leisure", "13:30", "17:00", 0.82],
      ["Eating", "18:00", "18:45", 0.85],
      ["Leisure", "19:00", "23:30", 0.8],
      ["Sleeping", "23:40", "23:59", 0.95],
    ],
    artifacts: [],
  },
  // Day 6 — Sun: planning; thesis intended again but drifts to leisure.
  {
    intentions: [
      { title: "Deep work: thesis", planStart: "10:00", planEnd: "12:00", projectId: "p_thesis" },
      { title: "Weekly review + plan", planStart: "19:00", planEnd: "20:00", projectId: "p_admin" },
    ],
    activities: [
      ["Sleeping", "00:00", "08:00", 0.95],
      ["Personal care", "08:00", "08:30", 0.8],
      ["Eating", "08:30", "09:00", 0.85],
      ["Leisure", "09:30", "11:30", 0.82], // thesis window → leisure
      ["Eating", "12:00", "12:40", 0.85],
      ["Working", "13:00", "16:00", 0.88],
      ["Chores", "16:30", "17:30", 0.75],
      ["Eating", "18:00", "18:40", 0.85],
      ["Working", "19:00", "20:00", 0.8],
      ["Leisure", "20:15", "22:45", 0.8],
      ["Sleeping", "23:00", "23:59", 0.95],
    ],
    artifacts: [
      ["commit", "jarvis: cognee memory", "15:40", "p_side"],
      ["task", "Plan next week", "19:55", "p_admin"],
    ],
  },
];

// --- Derive the emitted streams -------------------------------------------
const intentions = [];
const activities = [];
const artifacts = [];

WEEK.forEach((day, d) => {
  day.intentions.forEach((it, n) => {
    intentions.push({
      id: `i_${d}_${n}`,
      date: DAYS[d],
      title: it.title,
      planStart: ts(d, it.planStart),
      planEnd: ts(d, it.planEnd),
      projectId: it.projectId,
    });
  });
  day.activities.forEach(([label, start, end, confidence], n) => {
    activities.push({
      id: `a_${d}_${n}`,
      start: ts(d, start),
      end: ts(d, end),
      label,
      confidence,
      source: "seed",
    });
  });
  day.artifacts.forEach(([type, ref, at, projectId], n) => {
    artifacts.push({
      id: `art_${d}_${n}`,
      ts: ts(d, at),
      type,
      ref,
      projectId,
    });
  });
});

// --- Write -----------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
const files = { goals, projects, intentions, activities, artifacts };
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data, null, 2) + "\n");
}

// --- Summary + hero-condition self-checks ----------------------------------
const hours = (a) =>
  (Date.parse(a.end) - Date.parse(a.start)) / 3.6e6;
const byLabel = {};
for (const a of activities) byLabel[a.label] = (byLabel[a.label] || 0) + hours(a);

const thesisArtifactDays = new Set(
  artifacts.filter((x) => x.projectId === "p_thesis").map((x) => x.ts.slice(0, 10))
);
console.log(`seed written to ${OUT}`);
console.log(`  goals=${goals.length} projects=${projects.length} intentions=${intentions.length} activities=${activities.length} artifacts=${artifacts.length}`);
console.log("  hours by activity label:");
for (const [l, h] of Object.entries(byLabel).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${l.padEnd(14)} ${h.toFixed(1)}h`);
}
console.log("  hero checks:");
console.log(`    H1 Tue thesis intended, Working present, thesis artifacts Tue: ${thesisArtifactDays.has("2026-06-30") ? "FAIL" : "ok (none)"}`);
const lastThesis = artifacts.filter((x) => x.projectId === "p_thesis").map((x) => x.ts).sort().pop();
console.log(`    H3 last thesis artifact: ${lastThesis} (stalls Tue–Fri: ${!thesisArtifactDays.has("2026-06-30") && !thesisArtifactDays.has("2026-07-01") && !thesisArtifactDays.has("2026-07-02") && !thesisArtifactDays.has("2026-07-03") ? "ok" : "FAIL"})`);
const sideCommits = artifacts.filter((x) => x.projectId === "p_side").length;
const thesisArtifacts = artifacts.filter((x) => x.projectId === "p_thesis").length;
console.log(`    H2 side artifacts=${sideCommits} vs thesis artifacts=${thesisArtifacts} (misalignment vs stated #1 goal: ${sideCommits > thesisArtifacts ? "ok" : "FAIL"})`);
