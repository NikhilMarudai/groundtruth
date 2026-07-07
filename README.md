# Groundtruth (hackathon cut) — HackwithBay 3.0

A daily-accountability agent that reconciles what you **intended** vs. what you **actually did** by reasoning over a *life graph*, and can interpret a live camera frame (or a chosen photo) and fold it into that reasoning in real time.

Full design: [`docs/superpowers/specs/2026-07-07-jarvis-hackathon-design.md`](docs/superpowers/specs/2026-07-07-jarvis-hackathon-design.md)

## Modules
| Dir | What | External dep |
|---|---|---|
| `seed/` | Synthetic week generator → activities/intentions/artifacts/goals/projects JSON | none |
| `graph/` | Neo4j model + loader + reconciliation queries/algorithms | Neo4j Aura |
| `backend/` | Butterbase: schema, auth, billing, functions | Butterbase app |
| `pipeline/` | RocketRide pipeline → deployed to cloud.rocketride.ai | RocketRide Cloud |
| `web/` | React+Vite frontend → butterbase.dev (timeline, graph viz, camera, paywall) | Butterbase |

## The two AI-credit seams (stubbed until credit lands)
- **`LabelSource`** — `StubLabelSource` now → `GatewayVisionLabelSource` (Butterbase vision) later.
- **`Brain`** — `LocalStubBrain` now → `RocketRideCloudBrain` (hosted pipeline) later.

Everything else is buildable without AI credit.

## Setup checklist
- [ ] Butterbase: redeem `ENJOY0707` (select **Launch** plan at dashboard.butterbase.ai/billing)
- [ ] Neo4j Aura free instance
- [ ] RocketRide Cloud account + VS Code extension
- [ ] Cognee OSS (bonus, later)

## Quick start
```bash
node seed/generate.mjs      # writes seed/output/*.json
```
