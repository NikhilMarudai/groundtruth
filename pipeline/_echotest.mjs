import { RocketRideClient } from "rocketride";
const client = new RocketRideClient({
  auth: process.env.ROCKETRIDE_APIKEY, uri: "https://api.rocketride.ai",
  requestTimeout: 30000, onConnectError: (m)=>console.log("connErr:",m),
});
const stop = setTimeout(()=>{console.log("RESULT: TIMEOUT");process.exit(0);}, 40000);
try {
  await client.connect();
  const pipeline = {
    components: [
      { id:"webhook_1", provider:"webhook", config:{hideForm:true, mode:"Source", parameters:{}, type:"webhook"} },
      { id:"response_text_1", provider:"response_text", config:{laneName:"text"}, input:[{lane:"text", from:"webhook_1"}] }
    ],
    source: "webhook_1", project_id: "groundtruth", version: 1
  };
  const used = await client.use({ pipeline });
  console.log("USE ok, token:", used.token);
  const res = await client.send(used.token, "ping-123", { name:"input.txt" }, "text/plain");
  console.log("SEND result:", JSON.stringify(res)?.slice(0,600));
  try { await client.terminate(used.token); } catch {}
  console.log("RESULT: ROUND-TRIP OK");
} catch (e) {
  console.log("RESULT: FAILED —", e?.constructor?.name||"", String(e?.message||e));
}
clearTimeout(stop);
try { await client.disconnect(); } catch {}
process.exit(0);
