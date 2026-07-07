# Groundtruth (hackathon cut) — Design Spec

*HackwithBay 3.0 — "Building Graph-Aware Agentic Applications." Name: **Groundtruth** (the camera is the ground truth against your plan's prediction). Date: 2026-07-07.*

## One line
A daily-accountability agent that reconciles what you **intended** against what you **actually did**, by reasoning over a *life graph* — and can interpret a live camera frame (or a chosen photo) and fold it into that reasoning in real time.

## Why it fits the hackathon
The scored tech lives in the **brain**, not the camera. Reconciliation *is* graph traversal, so Neo4j is load-bearing, not decorative. The camera is the memorable opener; the graph is the substance.

| Requirement | How it's satisfied |
|---|---|
| **Butterbase** (db + auth + **payment**) | Auth, timeline/plan/nudge DB, photo storage, AI model gateway (vision), and a **subscription paywall** (free: today's timeline; Pro: reasoning + nudges + weekly review + live camera). Hosts the React frontend → `butterbase.dev` demo URL. |
| **Neo4j** (real traversal) | The **life graph**. Reconciliation path `Intention→Activity→Artifact`; graph algorithms **centrality** (where time truly goes) and **community detection** (daily "modes") power the weekly review. Not a KV store. |
| **RocketRide Cloud** (hosted pipeline) | The "smart-and-occasional" brain, deployed to `cloud.rocketride.ai`. On a notable gap it queries the graph, an LLM reasons over it, and it emits a nudge/insight. The app calls this managed endpoint. |
| **Cognee** (bonus) | Cross-session memory of stated goals/reflections (`remember`/`recall`), backed by Neo4j (hits both). |
| **Daytona** (bonus) | Out of v1. Only if we're ahead: sandbox where the agent runs a delegated coding task/tests. |

## Architecture — modules and their seams
Each module publishes a clean signal and is swappable. The two seams that touch AI credits are stubbed until credit lands, then swapped live with **no rearchitecture**.

```
seed/      Synthetic data generator → activities/intentions/artifacts/goals/projects JSON   [no external deps]
graph/     Neo4j model + loader + reconciliation queries/algorithms                          [needs Aura, no AI credit]
backend/   Butterbase: schema, auth, billing (Stripe Connect), serverless functions          [needs app, no AI credit except gateway]
pipeline/  RocketRide .pipe → deployed to cloud.rocketride.ai                                 [needs RocketRide acct + AI]
web/       React+Vite frontend → butterbase.dev (timeline, graph viz, camera, paywall)        [no AI credit]
```

### The clean interfaces (the modular contract)
1. **`LabelSource`** — `label(image) → { timestamp, label, confidence }`.
   - `StubLabelSource` (canned labels, **credit-free, use now**)
   - `GatewayVisionLabelSource` (Butterbase AI gateway vision call, **swap in when credits land**)
2. **`Brain`** — `reconcile(context) → Insight[]`.
   - `LocalStubBrain` (rule-based gap detection, **credit-free, use now**)
   - `RocketRideCloudBrain` (hosted pipeline, **swap in when credits + account ready**)
3. **`GraphStore`** — Neo4j client wrapper. Real from day one (no AI credit).
4. **`Backend`** — Butterbase SDK (auth, db, storage, billing). Real from day one.

Seams 1 and 2 are the only things gated on AI credit. Everything else is buildable now.

## Data model (Neo4j)
- **Nodes:** `Goal`, `Project`, `Intention`, `Activity` (a labeled time span), `Artifact` (commit/task/file), `Day`.
- **Edges:** `(Intention)-[:INTENDED_FOR]->(Project)`, `(Project)-[:ADVANCES]->(Goal)`, `(Activity)-[:OBSERVED_AS]->(label)`, `(Artifact)-[:PRODUCED_IN]->(Project)`, `(Intention)-[:PLANNED_ON]->(Day)`, `(Activity)/(Artifact)-[:ON]->(Day)`.
- **Reconciliation:** did intention *X* happen? → is there an `Activity` in its time block **and** an `Artifact` `PRODUCED_IN` its project that day. Gap = intention with matching activity presence but no artifact.
- **Algorithms:** degree/weighted **centrality** over time-by-project (where time concentrates vs. stated top goal); **community detection** over activity co-occurrence (daily modes) for the weekly "where your time went."

## Seed data (the demo's backbone)
Top-down: author the narrative, derive the streams. One persona, one week, with baked-in hero moments so the demo insight is guaranteed:
- **Hero 1 (drift):** Tue intended 3h thesis deep-work; camera shows present 09:10–10:30 then leisure; **zero thesis artifacts** → "present but produced nothing."
- **Hero 2 (misalignment):** across the week, most Working time went to the side project, though **Thesis is the stated #1 goal** → centrality exposes it.
- **Hero 3 (stall):** thesis last advanced Monday; by Friday → "hasn't advanced in 4 days."

Output shape (JSON):
```
goals.json       [{ id, title, priority }]
projects.json    [{ id, title, goalId }]
intentions.json  [{ id, date, title, planStart, planEnd, projectId }]
activities.json  [{ id, start, end, label, confidence, source:"seed" }]
artifacts.json   [{ id, ts, type, ref, projectId }]
```
A live camera frame at demo time produces one more `activities` row at "now" and triggers the brain to reason over it against today's intentions + recent history.

## Demo narrative (90 seconds)
Log in → week timeline + life graph → agent surfaces *"thesis goal hasn't advanced in 4 days — here's where the time went"* (centrality viz) → **"show me right now"** → webcam/photo → labeled → new node drops into the graph → pipeline re-reasons: *"you're on leisure now, plan said deep work, 3rd leisure block today"* → upgrade to Pro (payment).

## Build order
1. **seed/** generator → JSON. *(now, credit-free)*
2. **graph/** Aura + schema + loader + reconciliation queries. *(needs Aura signup)*
3. **backend/** Butterbase app: schema, auth, billing plan. *(needs the 1 app slot)*
4. **web/** timeline + graph viz + insight panel, wired to `StubLabelSource` + `LocalStubBrain`.
5. **Swap seams live** once credit lands: `GatewayVisionLabelSource`, then `RocketRideCloudBrain` deployed to cloud.
6. **Cognee** memory (bonus). Daytona only if ahead.

## External dependencies to set up (parallel track — "get money working")
- [ ] Butterbase: redeem `ENJOY0707` (select **Launch** plan at dashboard.butterbase.ai/billing) → unblocks AI gateway + lifts the 1-project cap.
- [ ] Neo4j Aura free instance → connection URI + credentials.
- [ ] RocketRide Cloud account (cloud.rocketride.ai) + VS Code extension.
- [ ] Cognee OSS (local, configured against Neo4j) — bonus, later.

## Scope guards
- Everything scored runs on **synthetic data** → the demo cannot fail on a live dependency.
- Camera has a **photo-picker fallback** → webcam flake ≠ broken demo.
- **Deploy the RocketRide pipeline to cloud early** — it's the least-familiar tool and a mandatory requirement.
- Perception = **one vision call**. No Swift, no Neural Engine (explicitly cut — it's the wrong tool for a timebox).

## Parked
- ~~Rename from "Jarvis"~~ → renamed to **Groundtruth**; subdomain `groundtruth.butterbase.dev` (app `app_c8rxilh0nxr6`).
- Multi-user / real on-device private perception — that's the real product, not the hackathon cut.
</content>
</invoke>
