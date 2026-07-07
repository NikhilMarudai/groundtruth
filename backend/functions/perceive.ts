// Butterbase serverless function: the live-perception loop (auth required).
// image -> [BB vision classify  ||  store frame to Storage] -> camera_events row
// (with image_object_id) + live Activity node in Neo4j -> contextual nudge.
//
// The frame is saved to Butterbase Storage (public per-object) so the demo is
// replayable and we keep labelled images for later. Vision + upload run in
// parallel so storage adds ~no latency. user_id auto-populated from the JWT.
//
// POST /fn/perceive  { image_url? | image_base64?, now? }
// envVars: NEO4J_HTTP, NEO4J_USER, NEO4J_PASSWORD, BUTTERBASE_API_KEY

const CATS = "Sleeping, Working, Exercising, Eating, Personal care, Chores, Leisure, Away";
const SYS =
  `You are Groundtruth perception. Classify the single primary human activity into EXACTLY one of: ${CATS}. ` +
  `'Away' = no person present. Reply ONLY strict JSON: {"label":"<one>","confidence":0.0-1.0,"reason":"<8 words max>"}`;

export default async function handler(req, ctx) {
  const { NEO4J_HTTP, NEO4J_USER, NEO4J_PASSWORD, BUTTERBASE_API_KEY } = ctx.env;
  const { BUTTERBASE_APP_ID, BUTTERBASE_API_URL } = ctx.env;
  const model = ctx.env.VISION_MODEL || "openai/gpt-4o-mini";

  let body = {};
  try { body = await req.json(); } catch (_) {}
  const now = body.now || "2026-07-03T10:00:00";
  const date = now.slice(0, 10);
  const imageUrl = body.image_url || (body.image_base64 ? `data:image/jpeg;base64,${body.image_base64}` : null);
  if (!imageUrl) return json({ error: "provide image_url or image_base64" }, 400);

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

  // Vision classification.
  async function classify() {
    const vr = await fetch(`${BUTTERBASE_API_URL}/v1/${BUTTERBASE_APP_ID}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BUTTERBASE_API_KEY}` },
      body: JSON.stringify({
        model, max_tokens: 120,
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
    return JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
  }

  // Best-effort: persist the frame to Storage; returns objectId or null.
  async function storeFrame() {
    try {
      let bytes, contentType = "image/jpeg";
      if (body.image_base64) {
        const bin = atob(body.image_base64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      } else {
        const ir = await fetch(imageUrl);
        if (!ir.ok) return null;
        bytes = new Uint8Array(await ir.arrayBuffer());
        contentType = ir.headers.get("content-type") || "image/jpeg";
      }
      const up = await fetch(`${BUTTERBASE_API_URL}/storage/${BUTTERBASE_APP_ID}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${BUTTERBASE_API_KEY}` },
        body: JSON.stringify({ filename: `frame_${Date.now()}.jpg`, contentType, sizeBytes: bytes.length, public: true }),
      });
      const uj = await up.json();
      if (!up.ok || !uj.uploadUrl) return null;
      const put = await fetch(uj.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: bytes });
      return put.ok ? uj.objectId : null;
    } catch { return null; }
  }

  try {
    // Classify and store the frame concurrently — storage adds ~no latency.
    const [parsed, imageObjectId] = await Promise.all([classify(), storeFrame()]);
    const label = parsed.label || "Away";
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;
    const reason = parsed.reason || "";

    await ctx.db.query(
      "INSERT INTO camera_events (label, confidence, reason, image_object_id) VALUES ($1, $2, $3, $4)",
      [label, confidence, reason, imageObjectId]
    );

    const id = "live_" + Date.now();
    await cypher(
      `CREATE (a:Activity {id:$id, label:$label, confidence:$conf, start:datetime($now), end:datetime($now), source:'live'})
       WITH a MERGE (day:Day {id:$date}) MERGE (a)-[:ON]->(day)`,
      { id, label, conf: confidence, now, date }
    );

    const [intendedRows, countRows] = await Promise.all([
      cypher(
        `MATCH (i:Intention)-[:INTENDED_FOR]->(p:Project)
         WHERE i.planStart <= datetime($now) AND i.planEnd > datetime($now)
         RETURN i.title AS intended, p.title AS project LIMIT 1`,
        { now }
      ),
      cypher(
        `MATCH (a:Activity)-[:ON]->(:Day {id:$date}) WHERE a.label = $label RETURN count(a) AS n`,
        { date, label }
      ),
    ]);
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

    await ctx.db.query(
      "INSERT INTO nudges (kind, title, body, severity, meta) VALUES ($1, $2, $3, $4, $5)",
      ["live", `Live check: ${label}`, nudge, severity, JSON.stringify({ now, label, confidence, intended })]
    );

    return json({ label, confidence, reason, now, intended, project, todayCount: n, nudge, severity, imageObjectId });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}

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
