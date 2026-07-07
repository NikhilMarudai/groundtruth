# Kindred — Design Spec

**HackwithBay 3.0 — "Graph-Aware Agentic Applications with Butterbase, Neo4j, and RocketRide Cloud"**
Date: 2026-07-07 · Status: approved concept, pre-plan
*(Supersedes `2026-07-07-latent-edge-design.md`, shelved as a fallback. This revision pivots from synthetic reviews to real company-stack data.)*

---

## 1. One-liner

**Kindred** is a **reference-architecture generator grounded in real companies.** You describe the product you want to build; Kindred finds real companies doing something similar, shows you the stacks they actually chose, and synthesizes a recommended architecture — **biased toward what the frontier is adopting**, so you build with cutting-edge tools instead of legacy defaults. "People like you" becomes **"companies like your idea,"** and their signal isn't opinions — it's their *revealed choices*, the tech they bet the company on.

**The wow:** type a one-line idea → watch the graph light up the companies building near you and converge on a modern, cited reference stack → scaffold it live in a sandbox. And it's the same engine, so it flips to any decision domain.

## 2. Problem

Picking a stack for a new project is guesswork drowned in noise. Generic "top 10 databases" listicles ignore your context; vendor docs are marketing; a 4.2★ tool rating blends the Fortune-500 architect and the solo hacker. The signal you actually want — *what did companies building something like my idea, recently, at my stage, actually choose?* — is a **relationship** question (idea → similar companies → their tools → why), locked inside scattered engineering blogs, job posts, and launch threads. StackShare tried to aggregate stacks but never matched them to *your idea*, never reasoned over the graph, and is effectively dead. Meanwhile the frontier moves fast: the best tools are what early-stage teams adopted last year, not what's been around for a decade. Kindred surfaces exactly that, explainably and with citations.

## 3. Why this fits the hackathon (all five sponsors load-bearing)

| Tool | Role | Requirement |
|---|---|---|
| **Butterbase** | Backend: auth, DB (users, saved projects, lookup history, subscriptions), AI gateway (Claude), **payment (Pro subscription)**, hosted React UI + `butterbase.dev` demo URL | ✅ database + auth + payment all active |
| **Neo4j** | The company↔tool knowledge graph. **`nodeSimilarity`** matches your idea to companies, **tool co-occurrence + Louvain** finds coherent stack archetypes, **centrality** ranks hub tools per domain, and constraint traversal filters. The traversal + frontier-weighted ranking IS the product. | ✅ actively traversed + graph algorithms |
| **RocketRide Cloud** | **Two** pipelines on `cloud.rocketride.ai`: (A) **curation** — company → web-search → extract {domain, stage, stack} with citations → graph (builds the seed); (B) **recommendation** — your idea → similar companies → synthesized, frontier-weighted reference architecture. | ✅ cloud-deployed managed endpoints |
| **Cognee** *(bonus)* | Per-user memory: your project context + past explorations, recalled across sessions. Open-source Cognee, Neo4j backend. | 🎁 memory bonus |
| **Daytona** *(bonus)* | Recommendation → running code: the agent scaffolds the recommended stack in a sandbox (skeleton repo, deps installed, boots) so you leave with a starting point, not just advice. | 🎁 sandbox bonus |

**Deep-integration defense:** no graph = no idea→company matching or stack archetypes; no RocketRide = no curation *and* no synthesis; no Butterbase = no app/auth/payment. Remove any one and the product collapses.

## 4. The core mechanic

**Idea-matched collaborative filtering on a graph of real companies**, with two kinds of edges:

- **Hard constraints** (`must be open-source`, `self-hostable`, `budget ≤ $X/mo`, `no vendor lock-in`) → *filter* the tool candidate set. Non-negotiable.
- **Soft context** (domain, what it does, stage/scale ambition, data shape) → *rank* by similarity to real companies.

Then **borrow the revealed stack choices of companies that both fit your constraints and resemble your idea**, weighted toward the frontier.

**Frontier weighting (the differentiator, concretely implementable):** every `(Company)-[:USES {since, source}]->(Tool)` carries a recency/stage signal (company founding year, funding stage, when the signal was observed). A tool's score for you = its prevalence **among recent, early-stage, similar companies**, plus an **adoption-slope** term that boosts *rising* tools and buries legacy ones. That is what surfaces cutting-edge choices instead of decade-old defaults.

**Why a graph, not vectors/SQL:** the output is a **path** — `your idea → these 6 similar companies → this recurring stack → why`, each edge citable. Vector similarity gives a black-box score; the graph gives the reasoning and the receipts, which is the whole value.

## 5. Neo4j graph model + algorithms

**Nodes:** `(:Company {name, founded, stage})`, `(:Tool {name, layer})`, `(:Domain {name})`, `(:Attribute {name})`, `(:Constraint {name})`, `(:Source {url, title})`, `(:StackArchetype)` *(materialized Louvain community)*, `(:Idea {...})` *(ephemeral, per-query — the user's project profile)*.

**Relationships:**
- `(:Company)-[:USES {since, confidence}]->(:Tool)` — the core signal, each backed by `-[:CITED_BY]->(:Source)`
- `(:Company)-[:IN_DOMAIN]->(:Domain)`, `(:Company)-[:HAS_CONTEXT {weight}]->(:Attribute)`
- `(:Tool)-[:SATISFIES|VIOLATES]->(:Constraint)`, `(:Tool)-[:AT_LAYER]->(layer: db/backend/frontend/infra/ai)`
- `(:Company)-[:SIMILAR_TO {score}]->(:Company)` and `(:Idea)-[:SIMILAR_TO {score}]->(:Company)` — **GDS `nodeSimilarity`**
- `(:Tool)-[:CO_OCCURS {count}]->(:Tool)` — derived; drives archetypes
- `(:Company|:Tool)-[:MEMBER_OF]->(:StackArchetype)` — **Louvain**

**Algorithms:**
1. **`nodeSimilarity`** over `HAS_CONTEXT` + `IN_DOMAIN` → match the user's `Idea` node to companies.
2. **Tool co-occurrence + Louvain** → coherent **stack archetypes** ("the modern AI-app stack"), so recommendations are *complete stacks*, not a bag of tools.
3. **Centrality** (degree/PageRank) per domain → hub tools.
4. **Frontier-weighted, constraint-filtered ranking** (see §4) → the final recommended stack, excluding anything that `VIOLATES` a `REQUIRES` constraint.
5. **Explanation path:** `Idea → top similar Companies → shared Tools → Sources`.

> Reliability: parameterized Cypher/GDS calls exposed as typed agent tools; the agent selects/fills them, never emits raw Cypher live.

## 6. Architecture & data flow

**Build-time (pre-seed, run before the demo):**
```
Seed company list (~150) ─► RocketRide Pipeline A (curation, cloud):
   for each company: web-search → extract {domain, stage, stack[] with sources} → validate → write to Neo4j
   then: GDS nodeSimilarity (company↔company), CO_OCCURS, Louvain archetypes, centrality
   → hand-verify the ~15 gold-path companies
```

**Run-time (live in the app):**
```
React UI (Butterbase-hosted) — "describe what you're building" + constraints
      │  idea text + constraints + auth
      ▼
Butterbase Function ── subscription gate (Free vs Pro) ──► 402 on Pro features if Free
      │
      └─► RocketRide Pipeline B (recommendation, cloud.rocketride.ai):
             1. idea text → structured Idea profile {domain, context attrs, constraints}  (Claude)
             2. Neo4j: match Idea→companies (nodeSimilarity), filter by constraints,
                frontier-weighted rank of tools, pull archetype + citations  [GDS]
             3. synthesize "Reference architecture for your idea" grounded in matched companies+sources (Claude)
             4. return { stack[], per-tool rationale + citations, similar companies, path, archetype }
      │
      ├─► Butterbase DB: save project + result
      ├─► Cognee: remember(idea, result)                    [Pro]
      └─► Daytona: scaffold recommended stack in a sandbox   [Pro]
```

### Typed agent tools (Neo4j)
`match_companies(idea)` · `rank_tools(idea, constraints, frontier_weighting)` · `stack_archetype(idea)` · `citations_for(company, tool)` · `explain_match(idea, companies)`.

## 7. Butterbase backend

- **Auth:** email + Google OAuth.
- **Payment (Stripe, test mode):** **Free** = idea→similar-companies + their raw stacks on ≤N lookups/day. **Pro** = the synthesized frontier-weighted **reference architecture** + unlimited + Daytona scaffold + Cognee memory. The locked **"Generate my reference architecture"** on Free → upgrade CTA → checkout → unlock is the live payment beat.
- **Schema (Butterbase Postgres — structured mirror; the graph lives in Neo4j):**
  - `users` (auth) · `projects` (user_id, idea_text, constraints_json, created_at) · `subscriptions` (user_id, plan, stripe_status) · `lookups` (user_id, project_id, result_summary, created_at)
- **AI gateway:** Claude for idea extraction + architecture synthesis.

## 8. Data seeding — agentic web-search curation

- **Method:** RocketRide Pipeline A curates a seed list of **~150 companies** where public stack signal is strong (YC/launch-covered startups, companies with "how we built X" eng blogs, active job posts). For each: web-search → extract `{domain, founded, stage, tools[] each with a source URL}`.
- **Honesty:** every `USES` edge stores its `Source`. Framed in-product as **"publicly-observed stack,"** not internal ground truth — the citations are a trust feature.
- **Frontier signal:** tag companies with founding year + stage so the ranking in §4 can weight recent/early-stage adoption.
- **Gold path:** hand-verify the ~15 companies + the 2–3 demo ideas so the on-stage result is bulletproof.
- **Generality flip:** a small **synthetic** appliance dataset (~20 items) proves the engine is category-agnostic without a second real-curation effort. Real where it matters, generic where it's just proof.

## 9. Demo script (~2 min)

1. **Sign in.** Type an idea: *"a realtime collaborative whiteboard with AI agents, solo founder, tight budget, want to self-host later."* Set a hard constraint: **open-source / self-hostable.**
2. Graph **lights up** the ~6 most similar real companies (Pipeline B → Neo4j `nodeSimilarity`); legacy-heavy or constraint-violating companies fade.
3. **"Generate my reference architecture"** (Pro-locked) → **upgrade → Stripe checkout → unlocks** → the agent returns a **frontier-weighted stack** with per-tool rationale **and citations**: *"CRDT layer: Yjs — used by 4 of your 6 matches, all founded post-2022; DB: Postgres+Electric; realtime: Party­Kit… (legacy option Firebase down-ranked: older adopters, violates self-host)."* Show the **path + stack archetype**.
4. *(Bonus)* **Daytona:** "scaffold it" → sandbox spins up a skeleton of that stack, installs deps, boots.
5. **The flip:** "this isn't a stack tool — it's an engine." Switch to **appliances** (synthetic) → same screen, same magic. Cognee recalls your project next session.

## 10. Build sequence & time budget (mandatory first; curation pre-seed is on the critical path)

| # | Task | Est |
|---|---|---|
| 0 | Provision Butterbase app + Neo4j Aura (GDS enabled) + repo + RocketRide project | 0.5h |
| 1 | **RocketRide Pipeline A (curation)** + Neo4j ETL/schema; run it to seed ~150 companies with citations; deploy to cloud | 2.5h |
| 2 | Neo4j: `nodeSimilarity` + CO_OCCURS + Louvain archetypes + frontier-weighted ranking, as typed tools | 1.5h |
| 3 | **RocketRide Pipeline B (recommendation)**; deploy to `cloud.rocketride.ai` | 1.5h |
| 4 | Butterbase: auth, schema, idea intake, subscription gate calling Pipeline B | 1.5h |
| 5 | Frontend: idea input + constraints + company graph + reference-architecture card w/ citations; deploy `butterbase.dev` | 2.0h |
| 6 | Gold-path hand-verification (~15 companies, 2–3 demo ideas) + small synthetic appliance flip | 1.0h |
| 7 | 🎁 Cognee memory · 🎁 Daytona scaffold | 2.0h |
| 8 | Rehearsal, polish, submit (`ENJOY0707` / `HackwithBay-0707`) | 1.0h |

**Cut-line order under time pressure (drop top-first):** Daytona → Cognee → Louvain-archetype polish → live appliance flip → shrink seed from 150 to ~60 companies. **Protected spine:** Butterbase auth+DB+payment, Neo4j GDS idea→company ranking, both RocketRide Cloud endpoints, one clean recommendation with citations, the payment beat.

## 11. Risks & mitigations

- **Data accuracy (top risk).** Public signals ≠ internal ground truth; LLM can mis-attribute a tool. → Store a `Source` on every `USES` edge, surface citations in-product, frame as "publicly-observed," and **hand-verify the gold path.** *Reframes a weakness into a trust feature.*
- **Curation time.** Web-search curation of 150 companies is the long pole. → Pre-seed before demo (never live), parallelize the pipeline, and the cut-line drops to ~60 companies if needed. *Front-loaded + degradable.*
- **GDS on Aura.** → Confirm GDS at task 0; fall back to Cypher-computed Jaccard if unavailable.
- **RocketRide Cloud deploy friction.** → Deploy an empty pipeline first, iterate against the live endpoint.
- **Idea→company match quality feels off on stage.** → Curate 2–3 demo ideas whose matches are hand-checked; free-form input is allowed but the gold path is rehearsed.
- **8h is tight solo.** → Mandatory-first ordering + cut-lines guarantee a submittable demo even if both bonuses and the flip drop.

## 12. Success criteria

- [ ] Live on `butterbase.dev` with working auth and a Free→Pro Stripe upgrade that gates the reference-architecture synthesis.
- [ ] Neo4j matches an idea to real companies via GDS and produces a **frontier-weighted, constraint-filtered** stack with an explainable, **cited** path (≥1 GDS algorithm: `nodeSimilarity` + ideally Louvain archetypes).
- [ ] **Both** RocketRide pipelines (curation + recommendation) deployed and running on `cloud.rocketride.ai`; the app calls the recommendation one live.
- [ ] Real seed of ≥60 companies with source citations on their `USES` edges.
- [ ] (Bonus) Cognee recalls a project across sessions; (Bonus) Daytona scaffolds the recommended stack.
- [ ] The 2-minute demo runs on the seeded graph with zero live external dependency (curation is pre-run).
