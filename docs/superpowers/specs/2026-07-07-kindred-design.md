# Kindred — Design Spec

**HackwithBay 3.0 — "Graph-Aware Agentic Applications with Butterbase, Neo4j, and RocketRide Cloud"**
Date: 2026-07-07 · Status: approved concept, pre-plan
*(Supersedes `2026-07-07-latent-edge-design.md`, which is shelved as a fallback.)*

---

## 1. One-liner

**Kindred** is a universal "people-in-your-exact-situation" recommendation engine. Reviews today are broken because they average over strangers. Kindred models people, their context, and what they chose as a graph, finds the users whose **situation** matches yours (hard constraints + soft preferences), and re-sorts every review + synthesizes a verdict grounded in *only* those people's experiences — for any high-consideration decision. **Hero demo: picking a database/tech stack. Then the same engine flips live to a totally different domain (appliances) to prove it's category-agnostic.**

**The wow:** one engine, two wildly different domains, magical in both — with an explainable path, not a black-box score.

## 2. Problem

Every high-stakes decision — which database, which bootcamp, which refrigerator — is drowned in reviews written by people who aren't you. A 4.2★ average blends the solo hacker and the Fortune-500 architect; the enterprise reviewer's "scales beautifully" is noise if you're prototyping on a free tier. The signal you want — *what did people in my exact situation choose, and what did they regret?* — is a **relationship** question (person → context → person → choice), which flat review sites and vector search can't answer and which ad networks answer only for advertisers, opaquely. Kindred answers it for the consumer, explainably.

## 3. Why this fits the hackathon (all five sponsors load-bearing)

| Tool | Role | Requirement |
|---|---|---|
| **Butterbase** | Backend: auth, DB (profiles, catalog, lookup history, subscriptions), AI gateway (Claude), **payment (Pro subscription)**, hosted React UI + `butterbase.dev` demo URL | ✅ database + auth + payment all active |
| **Neo4j** | The recommendation graph. **GDS `nodeSimilarity`** builds "people like you" edges, **Louvain** finds tribes, constraint traversal filters candidates, weighted-neighbor aggregation ranks, and a path query *explains*. The traversal IS the product. | ✅ actively traversed + graph algorithms |
| **RocketRide Cloud** | Two pipelines deployed to `cloud.rocketride.ai`: (a) onboarding text → structured profile; (b) matched-reviews retrieval → synthesized "Verdict for your situation" (GraphRAG). Called by Butterbase. | ✅ cloud-deployed managed endpoints |
| **Cognee** *(bonus)* | Per-user memory: the evolving context profile + past decisions, recalled across sessions. Open-source Cognee, Neo4j backend. | 🎁 memory bonus |
| **Daytona** *(bonus)* | For the dev-tools category: the agent spins up a sandbox and runs a quick benchmark/load-test to *prove* a recommended tool fits the user's use case — recommendation → verification. | 🎁 sandbox bonus |

**Deep-integration defense:** no graph = no "people like you" derivation; no RocketRide = no verdict synthesis; no Butterbase = no app/auth/payment. Pull any one and the product collapses.

## 4. The core mechanic (category-agnostic)

Context-matched collaborative filtering on a graph, with **two kinds of edges doing two jobs**:

- **Hard constraints** (`must-be-serverless`, `fridge width ≤ 33″`, `budget ≤ $X`) → *filter* the candidate set. Non-negotiable.
- **Soft preferences / context** (`relational data`, `solo team`, `prototyping`, `values-simplicity`) → *rank* by similarity to people like you.

You then **borrow the verdicts of people who both fit your constraints and share your context.** The graph is category-agnostic: "dev tools" vs "appliances" is *just which `Item`s, `Attribute`s, and `Constraint`s are loaded* — the schema and algorithms don't change. That's what makes "anything fits" an architectural fact, not a slogan.

**Why a graph, not vectors/SQL:** you're traversing `you → your context → people like you → what they chose → why`, and returning the **path** as the explanation. Vector similarity gives a black-box score; the graph gives the reason, which is the entire value proposition (and the "reasoning over connected data" the theme demands).

## 5. Neo4j graph model + algorithms

**Nodes:** `(:User)`, `(:Category)`, `(:Item {name})`, `(:Attribute {name})`, `(:Constraint {name})`, `(:Review {text, rating})`, `(:Tribe)` *(materialized Louvain community)*.

**Relationships:**
- `(:User)-[:HAS_CONTEXT {weight}]->(:Attribute)` — soft
- `(:User)-[:REQUIRES]->(:Constraint)` — hard
- `(:User)-[:WROTE]->(:Review)-[:OF]->(:Item)` with `(:Review)-[:RATED {stars}]`
- `(:Item)-[:HAS]->(:Attribute)`, `(:Item)-[:SATISFIES|VIOLATES]->(:Constraint)`, `(:Item)-[:IN]->(:Category)`
- `(:User)-[:SIMILAR_TO {score}]->(:User)` — **materialized by GDS `nodeSimilarity`**
- `(:User)-[:MEMBER_OF]->(:Tribe)` — **materialized by Louvain**

**Algorithms (the real graph-algorithm flex):**
1. **`nodeSimilarity`** (Jaccard over shared `HAS_CONTEXT` attributes + co-rated items) → `SIMILAR_TO` edges = "people like you."
2. **Louvain** over `SIMILAR_TO` → `Tribe` = your cohort (drives the "your tribe" visual).
3. **Constraint-filtered, similarity-weighted ranking:** for user U + item I, aggregate the ratings of U's `SIMILAR_TO` neighbors who reviewed I, weighted by `score`, **excluding items that `VIOLATE` any of U's `REQUIRES`.**
4. **Explanation path:** the shared-`Attribute` subgraph between U and the top-contributing neighbors → *"you and these 8 people all build relational + solo + budget-tight."*

> Reliability decision: pre-registered, parameterized Cypher/GDS calls exposed as typed agent tools — the agent selects and fills them, it does not emit raw Cypher live.

## 6. Architecture & data flow

```
React UI (Butterbase-hosted, butterbase.dev) — onboarding quiz + review page + category switcher
      │  profile / lookup + auth token
      ▼
Butterbase Function ── subscription gate (Free vs Pro) ──► 402 on Pro features if Free
      │
      ├─(onboarding)─► RocketRide pipeline A: quiz text → structured {context attrs, constraints} → write to Neo4j + Cognee
      │
      └─(lookup)─────► RocketRide pipeline B (cloud.rocketride.ai):
                          1. resolve user profile
                          2. Neo4j: rank + re-sort reviews for item/query, filtered by constraints  [GDS]
                          3. retrieve top-matched neighbors' review texts
                          4. synthesize "Verdict for your situation" (Claude via Butterbase gateway, grounded ONLY in matched reviews)
                          5. return { verdict, resorted_reviews[match%], tribe, path }
      │
      ├─► Butterbase DB: log lookup + verdict
      ├─► Cognee: remember(profile, decision)          [Pro]
      └─► Daytona: sandbox benchmark of recommended dev tool for the user's use case  [Pro, dev-tools only]
```

### Typed agent tools (Neo4j)
`resolve_profile(user)` · `rank_reviews(user, item)` → sorted by match-% with constraint filter · `matched_neighbor_reviews(user, item, k)` → texts for GraphRAG · `tribe_of(user)` · `explain_match(user, neighbors)` → path.

## 7. Butterbase backend

- **Auth:** email + Google OAuth.
- **Payment (Stripe, test mode):** **Free** = re-sorted reviews + match-% on ≤N lookups/day. **Pro** = the synthesized "Verdict for your situation" + unlimited + discovery feed + Cognee memory + Daytona verify. Gate enforced in a Butterbase function; the locked **"Verdict for you"** on Free → upgrade CTA → checkout → unlock is the live payment beat.
- **Schema (Butterbase Postgres — structured mirror; the graph lives in Neo4j):**
  - `users` (auth) · `profiles` (user_id, category, context_json snapshot) · `subscriptions` (user_id, plan, stripe_status) · `lookups` (user_id, category, item_or_query, verdict_summary, created_at)
- **AI gateway:** Claude for onboarding extraction + verdict synthesis.

## 8. Data seeding (synthetic, reliable, two categories)

LLM-generate once, deterministic seed, load into Neo4j. Per category:
- **Items:** ~20–40 (dev tools: Postgres, Mongo, DynamoDB, Supabase, Pinecone, etc. / appliances: fridges with real spec attributes).
- **Personas:** ~150–250, each with a context profile + ≥1 hard constraint.
- **Reviews:** each persona reviews ~5–15 items → ~1–2k reviews/category.
- **Demo fixtures:** a pre-built **"you"** persona + **two deliberately contrasting** personas per category, so the *same review page visibly re-sorts differently* for a solo hacker vs. an enterprise architect.

## 9. Demo script (~2 min)

1. **Onboard** as a new dev: 6-tap quiz — building what, scale, team size, data shape, budget, must-haves. Profile built (RocketRide pipeline A → Neo4j + Cognee).
2. Open the **"Postgres vs Mongo vs DynamoDB"** page. It **re-sorts live**: reviews from devs with your context float up tagged `92% match — solo, relational, budget-tight`; enterprise-scale reviews sink.
3. **"Verdict for your situation"** (Pro-locked) → tap → **upgrade → Stripe checkout → unlocks** → agent writes: *"For a solo prototype on relational data with a tight budget, people like you overwhelmingly chose Postgres/Supabase — 4.7 for your cohort. Caveat your matches flag: RLS gets hairy if you add multi-tenancy."* Show the **tribe + path**.
4. Toggle a **hard constraint** ("must be serverless") → violating options get filtered/flagged.
5. *(Bonus)* **Daytona**: "prove it" → sandbox runs a quick load test for the use case.
6. **THE FLIP:** "this isn't a dev-tools app — it's an engine." Switch category to **appliances**. Same screen, same magic: *"people with your kitchen constraints picked this fridge."* Cognee recalls you across the session.

## 10. Build sequence & time budget (mandatory first; the flip is core, not bonus)

| # | Task | Est |
|---|---|---|
| 0 | Provision Butterbase app + Neo4j Aura (GDS enabled) + repo + RocketRide project | 0.5h |
| 1 | Generate hero-category seed data (LLM) → Neo4j ETL (nodes/edges/indexes) | 2.0h |
| 2 | Neo4j: `nodeSimilarity` + Louvain + constraint-filtered ranking + explain, as typed tools | 1.5h |
| 3 | RocketRide pipelines A (onboarding) + B (verdict); **deploy to cloud.rocketride.ai** | 2.0h |
| 4 | Butterbase: auth, schema, onboarding write, subscription gate calling RocketRide | 1.5h |
| 5 | Frontend: quiz + re-sorted review page + Verdict + match-% + category switcher; deploy `butterbase.dev` | 2.0h |
| 6 | **Second category** seed + ETL (the generality flip) | 0.75h |
| 7 | 🎁 Cognee memory · 🎁 Daytona benchmark (dev-tools) | 2.0h |
| 8 | Gold-path rehearsal, polish, submit (`ENJOY0707` / `HackwithBay-0707`) | 1.0h |

**Cut-line order under time pressure (drop top-first):** Daytona → Cognee → Louvain tribe-viz polish → *(last resort)* live second-category flip (fall back to "generality is in the schema — here it is"). **Protected spine:** Butterbase auth+DB+payment, Neo4j GDS ranking, RocketRide Cloud endpoint, one clean re-sort + verdict, the payment beat. The **second-category flip ranks above both bonus tracks** because it's the core differentiator.

## 11. Risks & mitigations

- **Synthetic reviews feel fake** → generate with distinct persona voices + concrete specifics; curate the ~6 demo-visible reviews by hand. *Medium risk, mitigated by curating the gold path.*
- **GDS setup friction on Aura** → confirm GDS availability at task 0; fall back to Cypher-computed Jaccard if GDS is unavailable. *Front-loaded.*
- **RocketRide Cloud deploy friction** → deploy an empty pipeline first, iterate against the live endpoint. *Front-loaded.*
- **Two categories = double data work** → the engine/frontend are shared; only seed data differs, and category 2 is a smaller seed. *Scoped + cut-line protected.*
- **Live Cypher instability** → typed pre-registered tools, not free-form generation. *Mitigated by design.*
- **8h is tight solo** → mandatory-first ordering + explicit cut-lines guarantee a submittable demo even if both bonuses drop.

## 12. Success criteria

- [ ] Live on `butterbase.dev` with working auth and a Free→Pro Stripe upgrade that actually gates the Verdict.
- [ ] Neo4j re-sorts reviews by GDS-computed match-%, constraint-filtered, with an explainable path (+ at least one GDS algorithm: `nodeSimilarity` and/or Louvain).
- [ ] RocketRide pipeline running as a managed endpoint on `cloud.rocketride.ai`, called by the app, synthesizing the verdict.
- [ ] The **category flip** works live on a second domain with the same engine.
- [ ] (Bonus) Cognee recalls the profile across sessions; (Bonus) Daytona returns a real benchmark for a dev-tool pick.
- [ ] The full 2-minute demo runs on seeded data with zero live external dependency.
