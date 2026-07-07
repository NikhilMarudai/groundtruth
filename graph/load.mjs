// Load the synthetic seed into Neo4j as the life graph.
//
// Graph model:
//   (Goal)<-[:ADVANCES]-(Project)
//   (Intention)-[:INTENDED_FOR]->(Project)
//   (Intention)-[:PLANNED_ON]->(Day)
//   (Activity)-[:ON]->(Day)
//   (Artifact)-[:PRODUCED_IN]->(Project)
//   (Artifact)-[:ON]->(Day)
//
// Times are stored as datetime() so reconciliation can compare windows.
import { driver, seed } from "./lib.mjs";

const goals = seed("goals");
const projects = seed("projects");
const intentions = seed("intentions");
const activities = seed("activities");
const artifacts = seed("artifacts");

const d = driver();
const session = d.session();

async function run(cypher, params = {}) {
  await session.run(cypher, params);
}

try {
  console.log("wiping graph...");
  await run("MATCH (n) DETACH DELETE n");

  console.log("constraints...");
  for (const label of ["Goal", "Project", "Intention", "Activity", "Artifact", "Day"]) {
    await run(
      `CREATE CONSTRAINT ${label.toLowerCase()}_id IF NOT EXISTS
       FOR (n:${label}) REQUIRE n.id IS UNIQUE`
    );
  }

  console.log("goals + projects...");
  await run(`UNWIND $rows AS r MERGE (g:Goal {id:r.id}) SET g.title=r.title, g.priority=r.priority`, { rows: goals });
  await run(
    `UNWIND $rows AS r
       MERGE (p:Project {id:r.id}) SET p.title=r.title
       WITH p, r WHERE r.goalId IS NOT NULL
       MATCH (g:Goal {id:r.goalId}) MERGE (p)-[:ADVANCES]->(g)`,
    { rows: projects }
  );

  console.log("days...");
  const days = [...new Set([
    ...intentions.map((x) => x.date),
    ...activities.map((x) => x.start.slice(0, 10)),
    ...artifacts.map((x) => x.ts.slice(0, 10)),
  ])].map((date) => ({ id: date, date }));
  await run(`UNWIND $rows AS r MERGE (day:Day {id:r.id}) SET day.date=date(r.date)`, { rows: days });

  console.log("intentions...");
  await run(
    `UNWIND $rows AS r
       MERGE (i:Intention {id:r.id})
         SET i.title=r.title, i.planStart=datetime(r.planStart), i.planEnd=datetime(r.planEnd), i.date=r.date
       MERGE (p:Project {id:r.projectId}) MERGE (i)-[:INTENDED_FOR]->(p)
       MERGE (day:Day {id:r.date}) MERGE (i)-[:PLANNED_ON]->(day)`,
    { rows: intentions }
  );

  console.log("activities...");
  await run(
    `UNWIND $rows AS r
       MERGE (a:Activity {id:r.id})
         SET a.label=r.label, a.confidence=r.confidence,
             a.start=datetime(r.start), a.end=datetime(r.end), a.source=r.source
       MERGE (day:Day {id:substring(r.start,0,10)}) MERGE (a)-[:ON]->(day)`,
    { rows: activities }
  );

  console.log("artifacts...");
  await run(
    `UNWIND $rows AS r
       MERGE (x:Artifact {id:r.id})
         SET x.type=r.type, x.ref=r.ref, x.ts=datetime(r.ts)
       MERGE (p:Project {id:r.projectId}) MERGE (x)-[:PRODUCED_IN]->(p)
       MERGE (day:Day {id:substring(r.ts,0,10)}) MERGE (x)-[:ON]->(day)`,
    { rows: artifacts }
  );

  const { records } = await session.run(
    `MATCH (n) RETURN labels(n)[0] AS label, count(*) AS n ORDER BY label`
  );
  console.log("loaded:");
  for (const rec of records) console.log(`  ${rec.get("label").padEnd(10)} ${rec.get("n")}`);
  console.log("done.");
} finally {
  await session.close();
  await d.close();
}
