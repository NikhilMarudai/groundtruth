# pipeline/ — RocketRide Cloud: "The Reckoning" ✅ live

RocketRide is the **reasoning layer** of Groundtruth:

```
Neo4j (graph facts) ─▶ /fn/insights ─▶ RocketRide Cloud pipeline ─▶ reckonings table ─▶ frontend (Pro-gated)
                                        (LLM coach on Butterbase gateway)
```

`reckon.mjs` pulls the reconciled facts, runs them through the deployed RocketRide Cloud
pipeline (an LLM coach), and writes the resulting **weekly reckoning** narrative to the
public `reckonings` table. Remove RocketRide and there's no coaching — just numbers.

## What's deployed
- **`the-reckoning.pipe`** — `chat → agent_rocketride (coach) → response_answers`, with
  `memory_internal` + `llm_openai_api` attached to the agent. The LLM node points at
  **Butterbase's OpenAI-compatible gateway** (`base_url: https://api.butterbase.ai/v1`,
  `apikey: ${ROCKETRIDE_BB_KEY}`), so the coaching runs on the Butterbase AI credits — no
  separate provider key.
- Invoked over the RocketRide **WebSocket SDK** (`rocketride` npm), not REST:
  `connect → use(.pipe) → chat(Question) → terminate`. Endpoint `https://api.rocketride.ai`,
  API key `rr_…`.

## Run it
```bash
set -a; source .env; set +a      # ROCKETRIDE_APIKEY (rr_…), ROCKETRIDE_BB_KEY (bb_sk_…)
node pipeline/reckon.mjs         # facts → RocketRide → reckonings table
```
The frontend reads `GET /reckonings?order=created_at.desc&limit=1` and shows it in the
Pro-gated Reckoning card. Re-run any time (e.g. live in the demo) to regenerate.

## Files
- `the-reckoning.pipe` — the deployed pipeline (portable JSON).
- `reckon.mjs` — the worker (facts → pipeline → `reckonings`), retries transient socket drops.
- `hello.pipe` — minimal webhook→response echo, for connectivity testing.
- `coaching-prompt.md` — the coach's instructions (also embedded in the `.pipe`).

## Notes
- The RocketRide cloud socket occasionally resets mid-handshake; `reckon.mjs` retries 3×.
- Provider key note: `llm_openai_api` is the OpenAI-compatible node (also used for Nebius);
  its `base_url` is what lets us reuse the Butterbase gateway.
- Rotate the `rr_…` key after the hackathon (it's in `.env` + transcript).
