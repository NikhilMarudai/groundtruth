# Groundtruth — handoff & resume guide

Everything you need to pick this back up cold. Written at the end of the HackwithBay 3.0 build.

## TL;DR
Groundtruth is a **daily-accountability agent**: it reconciles what you *intended* vs. what you *actually did* over a **Neo4j life-graph**, reads a live camera/screen frame and drops it into the graph in real time, and a **RocketRide Cloud** pipeline coaches you on the gap. Backend is entirely **Butterbase**. It's **live, submitted, and demoable** on synthetic data. This doc is the map to resume or productize it.

## Live surfaces & accounts (inventory)
| Thing | Value |
|---|---|
| Live demo | https://groundtruth.butterbase.dev |
| GitHub | https://github.com/NikhilMarudai/groundtruth (public) |
| Butterbase app | `app_c8rxilh0nxr6` · dashboard.butterbase.ai |
| Neo4j Aura | instance `7bbeddb7` (`neo4j+s://7bbeddb7.databases.neo4j.io`) |
| RocketRide Cloud | `api.rocketride.ai`, key `rr_…`, pipeline `pipeline/the-reckoning.pipe` |
| Hackathon | HackwithBay 3.0 — **submitted** (v1, `app_id` attached). Deadline 2026-07-11. |
| Secrets | gitignored root `.env` (see "Credentials" below) |

## What's built (feature inventory)

**Two tabs** (top nav): **Dashboard** (the product) and **How it works** (the pitch).

**Dashboard**
- **Stall hero** — "#1 goal hasn't advanced in N days" (live Neo4j stat).
- **Live perception** — webcam capture, **"Read my screen"** (`getDisplayMedia`), or sample images → `/fn/perceive` → activity label + a contextual nudge vs. the current plan block. Frames are stored; your recent check-ins show as thumbnails (RLS-scoped to you).
- **Planned vs. actual calendar** (`DayView`) — a day's intentions beside actual activity spans on a shared time axis, per-day picker for the week, each actual block carries a stock thumbnail of the activity.
- **Reasoning layer** — the "why GraphRAG" argument: multi-week pattern detection (wellbeing signals, burnout, attention triggers, slacking). *(Replaced an earlier graph visualization.)*
- **Dashboard grid** — intention-vs-reality verdicts, goal-misalignment bars, time-by-activity.
- **The Reckoning** (Pro-gated) — animated dopamine stat rings (plans kept / movement / tracked) + count-up numbers, then a blunt weekly coaching narrative from the RocketRide pipeline.

**How it works** — `LandingHero` (cinematic), `ScenariosView` ("what it catches" problem vignettes), `VisionView` (why-a-graph + roadmap). Deep-link: `/#about`.

**Cross-cutting** — email **auth** (JWT), **RLS** per-user data, **payment** (Groundtruth Pro gating the Reckoning).

## What's real vs. demo (be honest with yourself later)
- **Real:** the Butterbase backend (DB/auth/payment-flow/gateway/storage/functions/hosting); Neo4j traversals (every insight is live Cypher); the vision model on real frames; the RocketRide Cloud pipeline + runs; RLS isolation.
- **Demo/stubbed:** the graph data is a **synthetic seed week** (`seed/`), and it's **one shared graph**, not per-user timelines. **Payment** uses a Butterbase-recorded subscription fallback (Stripe Connect onboarding never completed → no real charge). Day-view **thumbnails are stock Pexels images** (placeholders). **Cognee/Daytona** not integrated.

## Credentials (root `.env`, gitignored) — ROTATE THESE
`NEO4J_URI/USER/PASSWORD/HTTP`, `BUTTERBASE_API_KEY` (`bb_sk_…`), `ROCKETRIDE_APIKEY` (`rr_…`), `ROCKETRIDE_BB_KEY`. These were also visible in the build transcript — **rotate the Neo4j password, the `bb_sk` key, and the `rr_` key** if you keep the accounts. Nothing secret is committed (verified against tree + history).

## How to resume
```bash
# 1. data + graph
node seed/generate.mjs
set -a; source .env; set +a
npm --prefix graph run load          # load synthetic week into Neo4j
npm --prefix graph run insights      # sanity-check reconciliation/misalignment/stall from Cypher

# 2. RocketRide reckoning (regenerates the coaching narrative)
node pipeline/reckon.mjs

# 3. frontend (local dev)
npm --prefix web run dev
# deploy: npm --prefix web run build, then Butterbase create_frontend_deployment ->
#         PUT the zipped dist -> manage_frontend start_deployment (see backend/README.md)
```
Backend functions live in `backend/functions/*.ts` and are (re)deployed via the Butterbase `deploy_function` MCP tool with Neo4j creds as envVars. Full function list + deploy notes: [`backend/README.md`](../backend/README.md). Architecture + runtime flows: [`docs/architecture.md`](architecture.md).

## Known issues & gotchas
- **`perceive` cold start:** first call after a redeploy or idle stretch can take up to ~80s (then 504); warm calls ~7–9s. Warm it with one throwaway call before demoing.
- **1-hour session TTL, no refresh token** → "session expired, log in again." Re-login. (Add silent refresh for production.)
- **Stale CDN bundle** after a deploy — hard-refresh or append `?v=<ts>` to bust cache.
- **`DayView.tsx`** has 2 TS-strict warnings (runtime fine; Vite/esbuild builds anyway).
- **Thumbnails** load live from Pexels (network dependency) — self-host in Butterbase Storage to make bulletproof.
- **Dead code:** `web/src/GraphView.tsx` and the `/fn/graph` function are no longer used (graph viz was removed).

## The vision
A personal system that **sees what you actually do**, remembers it as a **graph that compounds** (day → month → year), and reasons over that accumulated memory to keep you aligned with what you said mattered — a real assistant, not a tracker. The demo proves the loop on one week; the product is what happens when it never stops.

## Turning it into a real product
1. **Real signals in.** Replace the synthetic seed: ingest a real calendar (intentions), git/task systems (artifacts), and real perception. The graph model already fits.
2. **On-device private perception.** The original design (see the Jarvis PRD, the seed of this project): tiered local vision on Apple's Neural Engine, frames classified and **discarded on-device**, only `{timestamp, label, confidence}` persists. This is the privacy story that makes an always-on camera acceptable.
3. **Per-user graphs.** Today it's one shared demo graph; give each user their own (namespaced/labelled subgraph or per-tenant DB).
4. **Real GraphRAG memory (Cognee).** Cognify reflections + history into the same Neo4j graph → answer multi-hop history questions ("when do I actually focus?") across months. This is the reasoning-layer promise made real.
5. **A planner agent.** Draft tomorrow from real patterns; proactive nudges when the graph sees drift/burnout/stall trajectories.
6. **Real payments.** Complete Stripe Connect onboarding (or use platform billing) so Pro is a real transaction.
7. **Robustness.** Refresh tokens, function warming/keep-alive, self-hosted assets, proper error/empty states, mobile polish.
8. **Privacy hardening.** Retention minimization, on-device-first, explicit consent — the wellbeing-pattern features especially demand care.

## Repo map
| Path | What |
|---|---|
| `seed/generate.mjs` | Deterministic synthetic week → `seed/output/*.json` (goals/projects/intentions/activities/artifacts) |
| `graph/` | Neo4j loader (`load.mjs`) + reconciliation/misalignment/stall queries (`queries.mjs`) |
| `backend/functions/` | `insights.ts`, `perceive.ts`, `day.ts`, `graph.ts` (unused) — the whole API |
| `backend/README.md` | Butterbase app facts, tables, functions, payment, deploy process |
| `pipeline/` | RocketRide `the-reckoning.pipe`, worker `reckon.mjs`, `coaching-prompt.md` |
| `web/src/` | React app — `App.tsx` (tabs + dashboard), plus `LandingHero`/`ScenariosView`/`VisionView`/`DayView`/`ReckoningStats`/`ReasoningLayer` |
| `docs/architecture.md` | Full tech-stack + runtime-flow explainer |
| `docs/submission.md` | Hackathon submission writeup + demo script |
