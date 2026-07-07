// Butterbase serverless function: the planned-vs-actual day view.
// For a chosen day it returns, aligned on a real time axis:
//   - intentions (what you PLANNED) with a reconciliation verdict, and
//   - activity spans (what you ACTUALLY did).
// Reuses the reconciliation logic from insights.ts (fulfilled /
// present-no-output / skipped). Reads Neo4j creds from ctx.env.
//
// GET /fn/day?date=2026-07-03   (auth none)

// Per-day reconciliation: same confirm-label + presence/output logic as
// insights.ts RECONCILE, but scoped to a single date and returning the
// intention's plan window so the frontend can position it on the axis.
const DAY_RECONCILE = `
MATCH (i:Intention)-[:INTENDED_FOR]->(p:Project)
WHERE i.date = $date
WITH i, p, CASE WHEN p.id = 'p_fit' THEN 'Exercising' ELSE 'Working' END AS confirm
OPTIONAL MATCH (a:Activity)-[:ON]->(:Day {id: i.date})
  WHERE a.label = confirm AND a.start < i.planEnd AND a.end > i.planStart
WITH i, p, confirm, count(a) AS presence
OPTIONAL MATCH (x:Artifact)-[:ON]->(:Day {id: i.date})
  WHERE (x)-[:PRODUCED_IN]->(p)
WITH i, p, confirm, presence, count(x) AS outputs
RETURN i.title AS title, toString(i.planStart) AS planStart, toString(i.planEnd) AS planEnd,
       p.title AS project,
       CASE
         WHEN confirm = 'Exercising' THEN CASE WHEN presence > 0 THEN 'fulfilled' ELSE 'skipped' END
         WHEN presence > 0 AND outputs > 0 THEN 'fulfilled'
         WHEN presence > 0 THEN 'present-no-output'
         ELSE 'skipped'
       END AS status
ORDER BY i.planStart, i.title`;

// Actual activity spans for the day. Exclude the zero-duration live point
// events (source:'live', start == end) that perceive inserts — they pile up
// at one instant and aren't real spans.
const DAY_ACTIVITIES = `
MATCH (a:Activity)-[:ON]->(:Day {id: $date})
WHERE a.end > a.start
RETURN a.label AS label, toString(a.start) AS start, toString(a.end) AS end, a.confidence AS confidence
ORDER BY a.start`;

const DAYS = `MATCH (d:Day) RETURN d.id AS id ORDER BY d.id`;

export default async function handler(req: Request, ctx: any): Promise<Response> {
  const { NEO4J_HTTP, NEO4J_USER, NEO4J_PASSWORD } = ctx.env;
  const date = new URL(req.url).searchParams.get("date") || "2026-07-03";
  const auth = "Basic " + btoa(`${NEO4J_USER}:${NEO4J_PASSWORD}`);

  async function cypher(statement: string, parameters: Record<string, any> = {}) {
    const r = await fetch(NEO4J_HTTP, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ statement, parameters }),
    });
    const j: any = await r.json();
    if (!r.ok || (j.errors && j.errors.length)) {
      throw new Error(`neo4j ${r.status}: ${JSON.stringify(j.errors || j)}`);
    }
    const { fields, values } = j.data;
    return values.map((row: any[]) =>
      Object.fromEntries(fields.map((f: string, i: number) => [f, row[i]]))
    );
  }

  try {
    const [intentions, activities, dayRows] = await Promise.all([
      cypher(DAY_RECONCILE, { date }),
      cypher(DAY_ACTIVITIES, { date }),
      cypher(DAYS),
    ]);
    const dates = dayRows.map((d: any) => d.id);
    return new Response(
      JSON.stringify({ date, dates, intentions, activities }, null, 2),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
