# pipeline/ — RocketRide Cloud: "The Reckoning"

RocketRide is the **reasoning layer** of Groundtruth:

```
Neo4j (graph facts) ──▶ RocketRide Cloud pipeline (LLM coach) ──▶ Butterbase (stores + serves)
```

The `insights` function pulls reconciled facts from the graph; RocketRide turns those
facts into a blunt-but-kind **weekly reckoning** narrative. Remove RocketRide and there's
no coaching — just numbers. That's the load-bearing role.

## Integration reality (important)
RocketRide Cloud is invoked over a **WebSocket SDK protocol**, not REST. Endpoint
`https://api.rocketride.ai`, auth via **API key** in the handshake. Butterbase's function
runtime can't run that SDK, so the call lives in a small Node worker here
([`reckon.mjs`](reckon.mjs)) that:
1. pulls facts from `/fn/insights`,
2. calls the deployed cloud pipeline via the `rocketride` SDK,
3. writes the narrative into Butterbase `nudges` (kind `reckoning`),
4. the frontend renders it.

> First I'll try the undocumented HTTP endpoint the `webhook` node mints (printed to the
> Project Log on deploy) — if a plain POST works, a Butterbase function can call RocketRide
> directly and we skip the worker. The SDK worker is the guaranteed fallback.

## The pipeline (build in the VS Code extension, then deploy to Cloud)
Nodes, wired left→right:

1. **`webhook`** (Source) — receives the graph-facts JSON.
2. **`agent_rocketride`** — the coach. Paste the system prompt from
   [`coaching-prompt.md`](coaching-prompt.md) into its instructions.
3. **`llm_openai`** (or `llm_anthropic`) — attached to the agent via a `control` link.
   Key via `${ROCKETRIDE_OPENAI_KEY}` (or point base URL at Butterbase's gateway — TBC).
4. **`response_text`** — returns the narrative.

Deploy: in the extension, choose the **Cloud** server target (uri `https://api.rocketride.ai`,
your API key), then `use()` the `.pipe`. Confirm it runs in the cloud dashboard.

## Verify connectivity first
Before building the full agent pipeline, deploy [`hello.pipe`](hello.pipe) (webhook →
response_text, echoes input) to confirm your key + cloud round-trip work. Then build up.

## What to send me once deployed
- Your **RocketRide API key** (`ROCKETRIDE_APIKEY`).
- The **project_id** the extension assigned (top of your `.pipe`).
- The **webhook endpoint URL + auth key** printed to the Project Log (so I can try the direct-HTTP path).

Then I finish `reckon.mjs`, wire the frontend "Reckoning" card, and we verify end-to-end.
