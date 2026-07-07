import { RocketRideClient } from "rocketride";
const auth = process.env.RR_KEY;
const uri = "https://api.rocketride.ai";
console.log("testing auth against", uri);
const client = new RocketRideClient({
  auth, uri, persist: false, maxRetryTime: 12000, requestTimeout: 12000,
  onConnectError: (m) => console.log("  onConnectError:", m),
  onConnected: async () => console.log("  onConnected fired"),
});
const hardStop = setTimeout(() => { console.log("RESULT: TIMEOUT (no response in 25s)"); process.exit(0); }, 25000);
try {
  await client.connect();
  console.log("RESULT: CONNECTED — auth accepted");
  try { await client.disconnect(); } catch {}
} catch (e) {
  console.log("RESULT: FAILED —", e?.constructor?.name || "", String(e?.message || e));
}
clearTimeout(hardStop);
process.exit(0);
