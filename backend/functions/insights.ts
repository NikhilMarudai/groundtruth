// Butterbase serverless function: the graph-reasoning endpoint.
// Queries the Neo4j life graph over the HTTPS Query API and returns the
// reconciliation / misalignment / stall / time-by-label insights.
//
// Deployed via deploy_function (see backend/deploy-insights.md). Reads Neo4j
// creds from ctx.env (set as encrypted envVars at deploy time).
// GET /fn/insights?now=2026-07-03T18:00:00

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

const MISALIGN = `
MATCH (g:Goal)
OPTIONAL MATCH (x:Artifact)-[:PRODUCED_IN]->(:Project)-[:ADVANCES]->(g)
RETURN g.title AS goal, g.priority AS priority, count(x) AS outputs
ORDER BY priority`;

const STALL = `
MATCH (g:Goal {priority: 1})<-[:ADVANCES]-(:Project)<-[:PRODUCED_IN]-(x:Artifact)
WITH g, max(x.ts) AS last
RETURN g.title AS goal, toString(last) AS lastAdvanced,
       duration.inDays(last, datetime($now)).days AS daysSince`;

const TIME_BY_LABEL = `
MATCH (a:Activity)
RETURN a.label AS label,
       sum(duration.inSeconds(a.start, a.end).seconds) / 3600.0 AS hours
ORDER BY hours DESC`;

export default async function handler(req: Request, ctx: any): Promise<Response> {
  const { NEO4J_HTTP, NEO4J_USER, NEO4J_PASSWORD } = ctx.env;
  const now = new URL(req.url).searchParams.get("now") || "2026-07-03T18:00:00";
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
    const [reconciliation, misalignment, stall, timeByLabel] = await Promise.all([
      cypher(RECONCILE),
      cypher(MISALIGN),
      cypher(STALL, { now }),
      cypher(TIME_BY_LABEL),
    ]);
    return new Response(
      JSON.stringify({ now, reconciliation, misalignment, stall, timeByLabel }, null, 2),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
