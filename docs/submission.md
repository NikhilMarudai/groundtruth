# Groundtruth — HackwithBay 3.0 Submission Draft

*Working copy for the final submission (code `ENJOY0707`, slug `HackwithBay-0707`). Field values to confirm with Nikhil before submitting.*

- **Project name:** Groundtruth
- **Demo URL:** https://groundtruth.butterbase.dev
- **Butterbase app_id:** `app_c8rxilh0nxr6` (pass on submit — scores Butterbase feature usage)
- **Repo:** (add link when pushed to GitHub)

---

## Project description

**The problem.** Intentions and follow-through drift apart. You plan a deep-work morning and three hours later you can't say where it went. Existing tools nag from a calendar (blind to what you actually did) or track your screen (blind to the physical world). Nothing reconciles *what you intended*, *what you physically did*, and *whether real output happened*.

**What Groundtruth does.** It's a daily-accountability agent built on that reconciliation:

- A **camera** (or sample frame) is classified into an activity by a vision model and dropped into a **life graph** at the current moment.
- The graph reconciles every planned block against reality: **fulfilled / present-but-no-output / skipped** — being at the desk isn't the same as shipping.
- Graph analytics expose the uncomfortable truths: your stated #1 goal has the fewest artifacts; it hasn't advanced in 4 days; here's where the hours actually went.
- A **RocketRide Cloud pipeline** turns those reconciled facts into a blunt-but-kind weekly **Reckoning** with one concrete action for tomorrow — gated behind a paid Pro tier.

**Why a graph (the real bet).** A life is the messiest dataset you own, and it's relationship-shaped: "did the 9am block advance the thesis?" touches an intention, a time window, an activity span, an artifact, a project, and a goal — one Cypher path, not a pile of JOINs. More importantly, graph memory **compounds**: every day of perception adds connected context, and the questions that matter ("when do I actually do deep work?", "what did I trade my thesis time for?") are multi-hop traversals over months of history, with the path as an explainable receipt. The demo shows one week; the product is what happens when it never stops. GraphRAG over your own life is the roadmap: Cognee-cognified reflections in the same graph, history Q&A, and a planner that drafts tomorrow from your real patterns.

## The Neo4j graph model (actively traversed, not a KV store)

**Nodes:** `Goal` (with stated priority) · `Project` · `Intention` (planned block with datetime window) · `Activity` (labelled time span from perception) · `Artifact` (commit/task — proof of output) · `Day`.

**Edges:** `(Project)-[:ADVANCES]->(Goal)` · `(Intention)-[:INTENDED_FOR]->(Project)` · `(Artifact)-[:PRODUCED_IN]->(Project)` · `(Activity)/(Artifact)-[:ON]->(Day)` · `(Intention)-[:PLANNED_ON]->(Day)`.

**Load-bearing traversals (all live):**
1. **Reconciliation** — per intention: datetime-window overlap join against Activities on the same Day + existence of Artifacts `PRODUCED_IN` the intended Project → verdict.
2. **Goal misalignment** — multi-hop `Artifact → Project → Goal` aggregation vs. each goal's stated priority (exposes 9 side-project artifacts vs 2 thesis artifacts against a #1-priority thesis goal).
3. **Top-goal stall** — `max(artifact.ts)` up the `Goal ← Project ← Artifact` path + `duration.inDays` → "hasn't advanced in 4 days."
4. **Live context** — each camera read inserts an `Activity` node at *now*, then traverses to the intention whose window covers this moment and counts today's same-label spans → the contextual nudge.
5. **Graph view** — `/fn/graph` serves the node-link structure for the on-page force-directed visualization.

## How the three mandatory technologies are woven in

**Butterbase (backend of everything):**
- **Database:** `camera_events`, `nudges`, `subscriptions` (all RLS user-isolated with auto-stamped `user_id`), `reckonings` (public serving table).
- **Auth:** email signup/login (JWT); the live camera + personal history are auth-gated; `perceive` runs as the end user.
- **Payment:** `Groundtruth Pro` plan ($9/mo) gating the Reckoning; checkout tries Stripe Connect and falls back to Butterbase-native purchase state (per BB docs' self-built checkout pattern).
- **AI gateway:** all vision classification AND the RocketRide pipeline's LLM node run through Butterbase's OpenAI-compatible gateway (`base_url` override) — one credit pool, no separate provider keys.
- **Storage:** every classified frame is persisted (presigned upload) and shown as thumbnails in the user's history — labelled training data for the personal model later.
- **Hosting:** the React frontend is deployed on Butterbase at the `butterbase.dev` demo URL; serverless functions (`insights`, `perceive`, `graph`, `day`) are the entire backend.

**Neo4j (the reasoning substrate):** the life graph above, queried live over the Aura HTTPS Query API from Butterbase functions. Every insight on screen is a traversal result; nothing is precomputed.

**RocketRide Cloud (the coaching brain):** `the-reckoning.pipe` — `chat → agent_rocketride (coach) → response_answers` with an `llm_openai_api` node pointed at Butterbase's gateway — is deployed and invoked on **api.rocketride.ai** via the `rocketride` SDK (`connect → use → chat → terminate`; the SDK `use()` call is RocketRide's deployment path to Cloud). The worker (`pipeline/reckon.mjs`) feeds it the reconciled graph facts and writes the returned narrative to `reckonings`, which the Pro-gated card renders. Remove RocketRide and there's no coach — just numbers.

**Optional tracks:** Cognee/Daytona — *(update before submit: state honestly what was/wasn't integrated)*.

## Demo script (90 seconds)
1. Open groundtruth.butterbase.dev → the stall hero: *"Ship thesis draft hasn't advanced in 4 days."*
2. Scroll: intention-vs-reality verdicts, the misalignment bars, the live graph viz — the side-project hub visibly dense with artifacts while thesis is sparse.
3. Log in → "See me right now" → webcam or a sample → the label drops into the graph and the agent nudges against the current plan block.
4. Upgrade to Pro (test card) → the Reckoning reveals: the RocketRide Cloud coach citing the real numbers.
5. (Optional live) `node pipeline/reckon.mjs` → fresh reckoning regenerates on stage.

## Pre-submit checklist
- [ ] Warm `perceive` with one throwaway call (~30s before demo — first call after idle can be slow).
- [ ] Push repo to GitHub; add link above.
- [ ] Confirm RocketRide dashboard shows recent cloud runs (proof if judges ask).
- [ ] Update the Cognee/Daytona line to match reality.
- [ ] Submit via agent: prep → confirm fields with Nikhil → submit with `app_id`.
