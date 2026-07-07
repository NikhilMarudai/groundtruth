// Butterbase serverless function: the live-perception loop.
// image -> BB vision gateway -> activity label -> (1) camera_events row,
// (2) a live Activity node inserted into the Neo4j graph at `now`, then
// (3) a contextual nudge reasoned from the graph (what was planned for this
// slot + how many times you've done this today) -> nudges row + response.
//
// POST /fn/perceive  { image_url? | image_base64?, now? }
// envVars: NEO4J_HTTP, NEO4J_USER, NEO4J_PASSWORD, BUTTERBASE_API_KEY

const CATS = "Sleeping, Working, Exercising, Eating, Personal care, Chores, Leisure, Away";
const SYS =
  `You are Jarvis perception. Classify the single primary human activity into EXACTLY one of: ${CATS}. ` +
  `'Away' = no person present. Reply ONLY strict JSON: {"label":"<one>","confidence":0.0-1.0,"reason":"<8 words max>"}`;

export default async function handler(req, ctx) {
  const { NEO4J_HTTP, NEO4J_USER, NEO4J_PASSWORD, BUTTERBASE_API_KEY } = ctx.env;
  const { BUTTERBASE_APP_ID, BUTTERBASE_API_URL } = ctx.env;
  const model = ctx.env.VISION_MODEL || "openai/gpt-4o-mini";

  let body = {};
  try { body = await req.json(); } catch (_) {}
  const now = body.now || "2026-07-03T10:00:00"; // Fri, inside the 09-12 thesis block
  const date = now.slice(0, 10);
  const imageUrl = body.image_url || (body.image_base64 ? `data:image/jpeg;base64,${body.image_base64}` : null);
  if (!imageUrl) {
    return json({ error: "provide image_url or image_base64" }, 400);
  }

  const neoAuth = "Basic " + btoa(`${NEO4J_USER}:${NEO4J_PASSWORD}`);
  async function cypher(statement, parameters = {}) {
    const r = await fetch(NEO4J_HTTP, {
      method: "POST",
      headers: { Authorization: neoAuth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ statement, parameters }),
    });
    const j = await r.json();
    if (!r.ok || (j.errors && j.errors.length)) throw new Error(`neo4j ${r.status}: ${JSON.stringify(j.errors || j)}`);
    const { fields, values } = j.data;
    return values.map((row) => Object.fromEntries(fields.map((f, i) => [f, row[i]])));
  }

  try {
    // 1) Vision: classify the frame (low detail — coarse activity, ~9x cheaper).
    const vr = await fetch(`${BUTTERBASE_API_URL}/v1/${BUTTERBASE_APP_ID}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BUTTERBASE_API_KEY}` },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: [
            { type: "text", text: "Classify this frame." },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ] },
        ],
      }),
    });
    const vj = await vr.json();
    if (!vr.ok) throw new Error(`vision ${vr.status}: ${JSON.stringify(vj.error || vj)}`);
    const raw = vj.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
    const label = parsed.label || "Away";
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;
    const reason = parsed.reason || "";

    // 2) Persist the raw perception event.
    await ctx.db.query(
      "INSERT INTO camera_events (label, confidence, reason) VALUES ($1, $2, $3)",
      [label, confidence, reason]
    );

    // 3) Insert a live Activity node into the graph at `now`.
    const id = "live_" + Date.now();
    await cypher(
      `CREATE (a:Activity {id:$id, label:$label, confidence:$conf, start:datetime($now), end:datetime($now), source:'live'})
       WITH a MERGE (day:Day {id:$date}) MERGE (a)-[:ON]->(day)`,
      { id, label, conf: confidence, now, date }
    );

    // 4) Reason from the graph: what was planned for this slot, and how many
    //    times have you done this activity today?
    const intendedRows = await cypher(
      `MATCH (i:Intention)-[:INTENDED_FOR]->(p:Project)
       WHERE i.planStart <= datetime($now) AND i.planEnd > datetime($now)
       RETURN i.title AS intended, p.title AS project LIMIT 1`,
      { now }
    );
    const countRows = await cypher(
      `MATCH (a:Activity)-[:ON]->(:Day {id:$date}) WHERE a.label = $label RETURN count(a) AS n`,
      { date, label }
    );
    const intended = intendedRows[0]?.intended || null;
    const project = intendedRows[0]?.project || null;
    const n = countRows[0]?.n ?? 1;

    const ordinal = n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
    let nudge, severity;
    if (intended && !isProductiveMatch(label, project)) {
      nudge = `Right now you're ${label.toLowerCase()} — but your plan said "${intended}". That's your ${ordinal} ${label.toLowerCase()} block today.`;
      severity = "warn";
    } else if (intended) {
      nudge = `You're on "${intended}" as planned. Keep going.`;
      severity = "ok";
    } else {
      nudge = `Right now you're ${label.toLowerCase()}. Nothing was planned for this slot.`;
      severity = "info";
    }

    // 5) Persist the nudge.
    await ctx.db.query(
      "INSERT INTO nudges (kind, title, body, severity, meta) VALUES ($1, $2, $3, $4, $5)",
      ["live", `Live check: ${label}`, nudge, severity, JSON.stringify({ now, label, confidence, intended })]
    );

    return json({ label, confidence, reason, now, intended, project, todayCount: n, nudge, severity });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}

// A Working block "counts" toward a work intention; Exercising counts toward fitness.
function isProductiveMatch(label, project) {
  if (!project) return false;
  if (project === "Fitness") return label === "Exercising";
  return label === "Working";
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
