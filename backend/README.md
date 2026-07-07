# backend/ — Butterbase app

**App:** `app_c8rxilh0nxr6` · **Demo URL:** https://groundtruth.butterbase.dev · **API base:** `https://api.butterbase.ai/v1/app_c8rxilh0nxr6`

## Tables
- `nudges` — insights the brain generated (kind, title, body, severity, meta, user_id) — **RLS user-isolated**
- `camera_events` — live labeled frames (label, confidence, reason, image_object_id, user_id) — **RLS user-isolated**
- `reckonings` — global weekly coaching narrative (narrative, facts, model, week_of) — **no RLS, public read**. The RocketRide worker writes here; the frontend reads the latest and gates it behind Pro.

## Payments (in active use)
- **Plan:** `Groundtruth Pro` — $9/mo (id `6a196a8b-b88f-4b84-a7cd-9779d03b781f`), created via `POST /v1/{app}/billing/plans`.
- **Flow:** frontend `POST /v1/{app}/billing/subscribe` (user JWT) → Stripe Checkout. The Reckoning card is Pro-gated.
- **Blocked on seller:** Stripe **Connect onboarding** must be completed once (account `acct_1TqgxpCQxNkfKXm3`) before checkout succeeds. Onboarding URL generated via `POST /v1/{app}/billing/connect/onboard`.

## Reckoning serving contract (for the RocketRide worker)
`pipeline/reckon.mjs` should `POST /v1/{app}/reckonings` (with the `bb_sk` service key) a row `{ narrative, facts, model, week_of }`. The frontend reads `GET /v1/{app}/reckonings?order=created_at.desc&limit=1` (public). An **interim** row (model `butterbase-gateway (interim, pre-RocketRide)`) is seeded so the UI works now; the worker's row supersedes it.

## Functions
| Name | Route | Auth | What |
|---|---|---|---|
| `insights` | `GET /fn/insights?now=<iso>` | none | Queries the Neo4j life graph over the HTTPS Query API → `{ reconciliation, misalignment, stall, timeByLabel }`. Source: [`functions/insights.ts`](functions/insights.ts). |
| `perceive` | `POST /fn/perceive` | **required (JWT)** | `{ image_url\|image_base64, now? }` → BB vision label + **stores the frame to Storage** (classify + upload run in parallel) → `camera_events` row (incl. `image_object_id`) + live `Activity` node in Neo4j → graph-reasoned nudge → `nudges` row. Source: [`functions/perceive.ts`](functions/perceive.ts). Uses `detail:"low"` vision. Runs as the end user; `user_id` auto-populated by the RLS trigger. |

> **Frames are persisted:** each read is saved to Butterbase Storage (public per-object) and its `objectId` stored on the row; the frontend mints a presigned download URL to show a thumbnail in the (RLS-scoped) check-in history. Good for demo replay + labelled training data.
>
> **⚠️ Cold start:** the first `perceive` call after a redeploy or idle period can be very slow (one 79s → 504 seen right after deploy); warm calls are ~7-9s. **Warm the function with one throwaway call before demoing.**

## Auth & RLS (in active use)
- **Auth:** email/password signup + login via `/auth/{app_id}/*` (JWT). The frontend gates the live camera + personal history behind login; `perceive` is `auth: required`.
- **RLS:** `camera_events` and `nudges` have user-isolation policies (`create_user_isolation` on `user_id`) — a BEFORE-INSERT trigger stamps `user_id` from the JWT, and each user reads only their own rows via the data API (`GET /v1/{app_id}/camera_events` with their token).

> Note: `perceive` inserts a live `Activity {source:"live"}` node per call. To reset the graph to the clean seed, rerun `npm --prefix graph run load`.

### Redeploy a function
Deploy via the Butterbase `deploy_function` MCP tool with `envVars` set. `insights` needs:
```
NEO4J_HTTP=https://<dbid>.databases.neo4j.io/db/neo4j/query/v2
NEO4J_USER=neo4j
NEO4J_PASSWORD=<aura password>
```
(Values live in the gitignored root `.env`.)

### Verify
```
curl -s https://api.butterbase.ai/v1/app_c8rxilh0nxr6/fn/insights | head
```

## ⚠️ Secrets to rotate after the hackathon
- Neo4j Aura password (injected into the `insights` function env; also in transcript).
- Butterbase `bb_sk_…` key (in `.env` and transcript).
