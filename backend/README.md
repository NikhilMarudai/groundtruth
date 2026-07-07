# backend/ — Butterbase app

**App:** `app_c8rxilh0nxr6` · **Demo URL:** https://groundtruth.butterbase.dev · **API base:** `https://api.butterbase.ai/v1/app_c8rxilh0nxr6`

## Tables (migration 1)
- `nudges` — insights the brain generated (kind, title, body, severity, meta, user_id)
- `camera_events` — live labeled frames (label, confidence, reason, image_object_id, user_id)

## Functions
| Name | Route | Auth | What |
|---|---|---|---|
| `insights` | `GET /fn/insights?now=<iso>` | none | Queries the Neo4j life graph over the HTTPS Query API → `{ reconciliation, misalignment, stall, timeByLabel }`. Source: [`functions/insights.ts`](functions/insights.ts). |
| `perceive` | `POST /fn/perceive` | **required (JWT)** | `{ image_url\|image_base64, now? }` → BB vision label → `camera_events` row + live `Activity` node in Neo4j → graph-reasoned nudge → `nudges` row. Source: [`functions/perceive.ts`](functions/perceive.ts). Uses `detail:"low"` vision. Runs as the end user; `user_id` auto-populated by the RLS trigger. |

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
