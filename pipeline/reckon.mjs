// The Reckoning worker: pulls reconciled graph facts from Butterbase, sends them
// to the deployed RocketRide Cloud pipeline (the-reckoning.pipe), gets the coaching
// narrative back, and writes it to the public `reckonings` table for the app to render.
//
// Run: set -a; source .env; set +a; node pipeline/reckon.mjs
// Env: ROCKETRIDE_APIKEY (rr_...), ROCKETRIDE_BB_KEY (bb_sk_..., used both for the
//      pipeline's LLM node via Butterbase's gateway AND to store the result).
import { RocketRideClient, Question } from "rocketride";

const BB = "https://api.butterbase.ai/v1/app_c8rxilh0nxr6";
const NOW = process.env.GROUNDTRUTH_NOW || "2026-07-03T18:00:00";
const PIPE = new URL("./the-reckoning.pipe", import.meta.url).pathname;
const env = { ROCKETRIDE_BB_KEY: process.env.ROCKETRIDE_BB_KEY };

// Run the RocketRide pipeline once and return the narrative. Retries transient
// WebSocket drops (the cloud socket occasionally resets mid-handshake).
async function reckon(facts, attempt = 1) {
  const client = new RocketRideClient({
    auth: process.env.ROCKETRIDE_APIKEY,
    uri: "https://api.rocketride.ai",
    requestTimeout: 90000,
    env,
  });
  try {
    await client.connect();
    try {
      const stale = await client.getTaskToken({ projectId: "groundtruth", source: "chat_1" });
      if (stale) await client.terminate(stale);
    } catch {}
    const used = await client.use({ filepath: PIPE, env });
    const q = new Question();
    q.addContext("Here are my graph facts as JSON:\n" + JSON.stringify(facts));
    q.addQuestion("Using the graph facts in this message, write this week's reckoning for me.");
    const res = await client.chat({ token: used.token, question: q });
    try { await client.terminate(used.token); } catch {}
    return Array.isArray(res?.answers) ? res.answers[0] : (res?.data?.answer ?? JSON.stringify(res));
  } catch (e) {
    if (attempt < 3) {
      console.warn(`  transient RocketRide error (attempt ${attempt}): ${String(e?.message || e).slice(0, 80)} — retrying`);
      await new Promise((r) => setTimeout(r, 2000));
      return reckon(facts, attempt + 1);
    }
    throw e;
  } finally {
    try { await client.disconnect(); } catch {}
  }
}

async function main() {
  // 1) Facts from the graph (Neo4j, via the deployed Butterbase function).
  const facts = await (await fetch(`${BB}/fn/insights?now=${encodeURIComponent(NOW)}`)).json();

  // 2) Reasoning via RocketRide Cloud (LLM runs on Butterbase's gateway).
  const narrative = await reckon(facts);
  console.log("\n=== The Reckoning ===\n" + narrative + "\n");

  // 3) Store in the public `reckonings` table (service key). The frontend reads
  //    GET /reckonings?order=created_at.desc&limit=1 and gates it behind Pro.
  const r = await fetch(`${BB}/reckonings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ROCKETRIDE_BB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ narrative, facts, model: "gpt-4o-mini · Butterbase gateway", week_of: "Jun 29" }),
  });
  console.log("stored in reckonings:", r.status);
}

main().catch((e) => { console.error(e); process.exit(1); });
