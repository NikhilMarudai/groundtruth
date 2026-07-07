// The load-bearing part: reconciliation + multi-hop insight queries.
// Run: NEO4J_URI=... NEO4J_PASSWORD=... node graph/queries.mjs
// This is also the reference the LocalStubBrain / RocketRide pipeline mirror.
import { driver, NOW } from "./lib.mjs";

const num = (v) => (typeof v?.toNumber === "function" ? v.toNumber() : v);

const d = driver();
const session = d.session();

// 1) RECONCILIATION — per intention: did a confirming activity happen in the
//    planned window, and (for work) did real output ship that day?
//    Statuses: fulfilled | present-no-output | skipped.
const RECONCILE = `
MATCH (i:Intention)-[:INTENDED_FOR]->(p:Project)
WITH i, p, CASE WHEN p.id = 'p_fit' THEN 'Exercising' ELSE 'Working' END AS confirm
OPTIONAL MATCH (a:Activity)-[:ON]->(:Day {id: i.date})
  WHERE a.label = confirm AND a.start < i.planEnd AND a.end > i.planStart
WITH i, p, confirm, count(a) AS presence
OPTIONAL MATCH (x:Artifact)-[:ON]->(:Day {id: i.date})
  WHERE (x)-[:PRODUCED_IN]->(p)
WITH i, p, confirm, presence, count(x) AS outputs
RETURN i.date AS date, i.title AS title, p.title AS project, presence, outputs,
       CASE
         WHEN confirm = 'Exercising' THEN CASE WHEN presence > 0 THEN 'fulfilled' ELSE 'skipped' END
         WHEN presence > 0 AND outputs > 0 THEN 'fulfilled'
         WHEN presence > 0 THEN 'present-no-output'
         ELSE 'skipped'
       END AS status
ORDER BY date, title`;

// 2) MISALIGNMENT — multi-hop Artifact->Project->Goal, output vs stated priority.
const MISALIGN = `
MATCH (g:Goal)
OPTIONAL MATCH (x:Artifact)-[:PRODUCED_IN]->(:Project)-[:ADVANCES]->(g)
RETURN g.title AS goal, g.priority AS priority, count(x) AS outputs
ORDER BY priority`;

// 3) STALL — days since the #1-priority goal last advanced (multi-hop + duration).
const STALL = `
MATCH (g:Goal {priority: 1})<-[:ADVANCES]-(:Project)<-[:PRODUCED_IN]-(x:Artifact)
WITH g, max(x.ts) AS last
RETURN g.title AS goal, last AS lastAdvanced,
       duration.inDays(last, datetime($now)).days AS daysSince`;

// 4) TIME BY LABEL — where the hours physically went (aggregation over spans).
const TIME_BY_LABEL = `
MATCH (a:Activity)
RETURN a.label AS label,
       sum(duration.inSeconds(a.start, a.end).seconds) / 3600.0 AS hours
ORDER BY hours DESC`;

try {
  console.log(`\n=== Groundtruth insights  (now = ${NOW}) ===\n`);

  console.log("RECONCILIATION (intention vs. reality)");
  const rec = await session.run(RECONCILE);
  const mark = { fulfilled: "✅", "present-no-output": "⚠️ ", skipped: "❌" };
  for (const r of rec.records) {
    console.log(
      `  ${mark[r.get("status")]} ${r.get("date")}  ${r.get("title").padEnd(26)} ` +
        `[${r.get("project")}]  ${r.get("status")}`
    );
  }

  console.log("\nGOAL MISALIGNMENT (output vs. stated priority)");
  const mis = await session.run(MISALIGN);
  for (const r of mis.records) {
    console.log(
      `  #${num(r.get("priority"))} ${r.get("goal").padEnd(22)} ${num(r.get("outputs"))} artifacts`
    );
  }

  console.log("\nTOP-GOAL STALL");
  const st = await session.run(STALL, { now: NOW });
  for (const r of st.records) {
    console.log(
      `  "${r.get("goal")}" last advanced ${r.get("lastAdvanced").toString().slice(0, 16)} ` +
        `→ ${num(r.get("daysSince"))} days ago`
    );
  }

  console.log("\nWHERE THE TIME WENT");
  const tl = await session.run(TIME_BY_LABEL);
  for (const r of tl.records) {
    console.log(`  ${r.get("label").padEnd(14)} ${r.get("hours").toFixed(1)}h`);
  }
  console.log();
} finally {
  await session.close();
  await d.close();
}
