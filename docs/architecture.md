# Groundtruth — architecture & how it runs

A plain-English map of the whole system, so anyone can explain it.

## One sentence
A React app hosted on **Butterbase** calls **Butterbase serverless functions**, which traverse a **Neo4j** life-graph over HTTPS and call the **Butterbase AI gateway** for vision; a **RocketRide Cloud** pipeline turns the reconciled graph into coaching. No servers to manage.

## The five layers

**1. Frontend — React + Vite (`web/`)**
A single-page app, built to static files and hosted by Butterbase at `groundtruth.butterbase.dev`. It holds **no secrets**: it only calls public functions and the app's own auth/data endpoints with the logged-in user's JWT. Components: LandingHero, ScenariosView, the dashboard (stall/reconciliation/misalignment/time), GraphView (force-directed SVG), DayView (planned-vs-actual calendar), the live camera panel, the Pro-gated Reckoning card, VisionView.

**2. Backend — Butterbase (the entire server side)**
- **Postgres** tables: `camera_events`, `nudges`, `subscriptions` (RLS user-isolated — each user sees only their rows, `user_id` auto-stamped from the JWT), `reckonings` (public).
- **Auth:** email signup/login issuing JWTs. The live camera + personal history are gated.
- **Payment:** a `Groundtruth Pro` plan; checkout tries Stripe Connect, falls back to Butterbase-recorded purchase state.
- **AI gateway:** one OpenAI-compatible endpoint for GPT/Claude/Gemini — powers **both** the vision classification and the RocketRide LLM node (one credit pool, no per-provider keys).
- **Storage:** every classified frame is saved (presigned upload); the UI mints download URLs for thumbnails.
- **Serverless functions** (the whole API): `insights`, `graph`, `day` (public reads over Neo4j) and `perceive` (auth-required write path).
- **Hosting:** serves the static frontend.

**3. Graph — Neo4j Aura (`graph/`)**
The life-graph: nodes `Goal · Project · Intention · Activity · Artifact · Day`; edges `ADVANCES · INTENDED_FOR · PRODUCED_IN · ON · PLANNED_ON`. Butterbase functions query it over the **Aura HTTPS Query API** (POST Cypher, HTTP Basic auth) — no driver needed inside the function runtime. Every insight on screen is a live traversal, not precomputed.

**4. Reasoning — RocketRide Cloud (`pipeline/`)**
`the-reckoning.pipe` — `chat → agent_rocketride (coach) → response_answers`, with an `llm_openai_api` node pointed at Butterbase's gateway. Deployed/invoked on `api.rocketride.ai` via the `rocketride` SDK (`connect → use → chat → terminate`). The worker `reckon.mjs` feeds it reconciled facts and writes the narrative to `reckonings`.

**5. Data + creds**
Demo data is a deterministic synthetic week (`seed/`) loaded into Neo4j. All secrets live in a gitignored root `.env` (Neo4j creds, `bb_sk` service key, `rr_` RocketRide key); functions receive Neo4j creds as encrypted envVars at deploy time. Nothing secret is in the repo or the frontend bundle.

## The runtime flows

**A. Page load (public).** Frontend → `GET /fn/insights`, `/fn/graph`, `/fn/day`, `GET /reckonings`. Each function opens the Aura HTTPS Query API, runs Cypher (reconciliation / node-link / day timeline), returns JSON. The dashboard, graph viz, and calendar render from live traversals.

**B. Live perception (auth).** User shares a webcam/screen/sample frame → `POST /fn/perceive` with their JWT. The function, in parallel: (1) calls the **AI gateway** vision model to classify the frame, (2) uploads the frame to **Storage**. Then it inserts a live `Activity` node into **Neo4j** at "now," traverses to the intention whose time-window covers this moment, counts today's same-label spans, composes a contextual nudge, and writes rows to `camera_events` + `nudges` (RLS auto-stamps `user_id`). Returns the label + nudge.

**C. The Reckoning (RocketRide).** `reckon.mjs`: `GET /fn/insights` for facts → `rocketride` SDK `connect/use(the-reckoning.pipe)/chat(facts)` on **api.rocketride.ai** → the coach LLM (running on Butterbase's gateway) returns a narrative → `POST /reckonings`. The frontend reads the latest and reveals it behind the Pro gate.

**D. Auth + payment.** Signup/login → JWT in localStorage → sent on gated calls. RLS scopes every read/write to the user. Upgrade → `startProCheckout` (Stripe Connect, else record a `subscriptions` row) → `isPro()` unlocks the Reckoning.

## Why each mandatory tech is load-bearing (not bolted on)
- **Butterbase** *is* the backend — remove it and there's no DB, auth, payment, gateway, storage, or host.
- **Neo4j** *is* the reasoning — every verdict/stat is a traversal a flat table couldn't express cleanly; reconciliation is a path, not a JOIN.
- **RocketRide** *is* the coach — remove it and you have numbers with no narrative.

## If a judge asks…
- *"Is Neo4j just a KV store?"* No — reconciliation joins time-windows to activities to artifacts; misalignment and stall are multi-hop `Artifact→Project→Goal` traversals with `duration.inDays`.
- *"How is the pipeline on Cloud, not local?"* The `rocketride` SDK `use()` call uploads/runs the pipeline as a task on `api.rocketride.ai`; runs show in the RocketRide dashboard.
- *"Where's the AI?"* All through Butterbase's gateway — vision (gpt-4o-mini) and the RocketRide coach LLM.
- *"Is payment real?"* Real Stripe Connect flow is wired; a Butterbase-recorded fallback makes it demoable without completing seller onboarding.
