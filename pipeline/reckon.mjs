// The Reckoning worker: pulls reconciled graph facts from Butterbase, sends them
// to the deployed RocketRide Cloud pipeline (WebSocket SDK), and gets back the
// coaching narrative. Finalized once a RocketRide API key + deployed pipeline exist.
//
// Run: ROCKETRIDE_APIKEY=... node pipeline/reckon.mjs
// Deps: npm --prefix pipeline install   (installs the `rocketride` SDK)
//
// NOTE: pending the RocketRide account. The SDK call shape below matches the
// documented API (connect -> use -> send -> terminate); the Butterbase write-back
// (into the `nudges` table) is wired once we confirm the endpoint end-to-end.

import { RocketRideClient } from "rocketride";

const BB = "https://api.butterbase.ai/v1/app_c8rxilh0nxr6";
const PIPE = new URL("./the-reckoning.pipe", import.meta.url).pathname;
const NOW = process.env.GROUNDTRUTH_NOW || "2026-07-03T18:00:00";

async function main() {
  // 1) Facts from the graph (via the deployed Butterbase function).
  const facts = await (await fetch(`${BB}/fn/insights?now=${encodeURIComponent(NOW)}`)).json();

  // 2) Reasoning via the RocketRide Cloud pipeline.
  const client = new RocketRideClient({
    auth: process.env.ROCKETRIDE_APIKEY,
    uri: "https://api.rocketride.ai",
  });
  await client.connect();
  const { token } = await client.use({ filepath: PIPE });
  const resp = await client.send(
    token,
    JSON.stringify(facts),
    { name: "facts.json" },
    "application/json"
  );
  await client.terminate(token);

  const narrative = resp?.data?.answer ?? resp?.result ?? JSON.stringify(resp);
  console.log("\n=== The Reckoning ===\n" + narrative + "\n");

  // 3) TODO once verified: upsert `narrative` into Butterbase `nudges`
  //    (kind='reckoning') so the frontend renders it.
}

main().catch((e) => { console.error(e); process.exit(1); });
