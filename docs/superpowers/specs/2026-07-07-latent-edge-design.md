# Latent Edge — Design Spec

**HackwithBay 3.0 — "Graph-Aware Agentic Applications with Butterbase, Neo4j, and RocketRide Cloud"**
Date: 2026-07-07 · Status: approved concept, pre-plan

---

## 1. One-liner

**Latent Edge** is a biomedical research agent that finds the connection nobody annotated. A researcher asks whether a gene matters in a context it was never studied in; the agent traverses a Neo4j knowledge graph of genes, cell types, tissues, pathways, and drugs to surface **non-obvious multi-hop connections** a flat search (or an LLM working from memory) can't, then **empirically verifies** a finding by running a real single-cell analysis in a Daytona sandbox.

**The wow:** the graph physically lights up the path linking a gene to a context it isn't directly annotated for — a link the agent *derived*, not retrieved.

## 2. Problem

Biology is a relationship problem trapped in flat databases. A gene's role is annotated in the contexts where someone happened to study it; its latent relevance elsewhere — via a shared pathway, a common drug target, a co-marker cell type — sits unconnected across separate tables. Researchers (and today's LLM research tools) miss these because nothing traverses the connections. This is exactly the shape graph databases win at, and exactly the shape an LLM alone gets wrong (it hallucinates plausible links instead of deriving real ones from data).

## 3. Why this fits the hackathon (all five sponsors load-bearing)

| Tool | Role | Requirement |
|---|---|---|
| **Butterbase** | Backend: auth, DB (users, query history, saved dossiers), storage (`.h5ad`, reports), AI model gateway (Claude), **payment (Pro subscription)**, hosted React UI + `butterbase.dev` demo URL | ✅ database + auth + payment all active |
| **Neo4j** | The biomedical knowledge graph. Agent runs **multi-hop Cypher traversal + a graph algorithm** (shortest-path between two genes; degree/betweenness centrality for hub genes). Genuinely load-bearing — the product *is* the traversal. | ✅ actively traversed, not KV |
| **RocketRide Cloud** | The reasoning pipeline (intent → plan traversal → execute Cypher tools → synthesize dossier), deployed to `cloud.rocketride.ai` and called by a Butterbase function. | ✅ cloud-deployed managed endpoint |
| **Cognee** *(bonus)* | Per-user research memory across sessions — remembers explored genes, contexts, hypotheses; recall on return. Open-source Cognee configured with Neo4j as backend. | 🎁 memory bonus track |
| **Daytona** *(bonus)* | Isolated sandbox where the agent writes + runs a real `scanpy` differential-expression analysis on a seeded `.h5ad` to verify a graph-derived connection empirically. | 🎁 sandbox bonus track |

**Deep-integration defense:** remove any one of the three mandatory tools and the product stops working — no graph = no derivation, no RocketRide = no reasoning, no Butterbase = no app/auth/payment. None are bolted on.

## 4. Data (all local, reused from the Organism project — no external APIs at demo time)

Source: `~/Desktop/Code/Organism/backend/tool_layer/data/`. Pre-cleaned, bundled.

- **PanglaoDB markers** (`panels/panglao/panglao_markers.json`) — ~15k gene→cell-type markers across ~348 (organism, organ, cell-type) tuples.
- **Gene sets / Hallmark pathways** (`gene_sets/catalog.json`) — 58 curated sets, gene→pathway with citations.
- **DGIdb drug–gene interactions** (`drug_dbs/dgidb_interactions.json.gz`) — 4,858 genes → drugs, with interaction type, PMIDs, approval status, score.
- **Annotated datasets** (`backend/tests/fixtures/*.h5ad`) — incl. `leng2021_ec.h5ad` (human **Alzheimer's entorhinal cortex**), `pbmc3k.h5ad`. Used for the Daytona verification step and to derive a lightweight disease/condition context layer.
- **Gene-ID harmonization** logic exists (`gene_id_harmonize.py`, `gene_resolver.py`) — run upfront; canonical identifier = **gene symbol**.

## 5. Neo4j graph model

**Nodes**
- `(:Gene {symbol, ensembl?, entrez?})`
- `(:CellType {name})`
- `(:Tissue {name})`
- `(:Organism {name})`
- `(:Pathway {name, source, citation})` — from gene sets catalog
- `(:Drug {name, approval_status})`
- `(:Context {name})` — lightweight derived condition/disease layer (e.g. "Alzheimer's EC"), from dataset annotations + disease-flavored gene sets. Optional, demo-facing.

**Relationships**
- `(:Gene)-[:MARKER_FOR {confidence, tissue_specific}]->(:CellType)`
- `(:CellType)-[:FOUND_IN]->(:Tissue)`
- `(:Tissue)-[:IN_ORGANISM]->(:Organism)`
- `(:Gene)-[:MEMBER_OF]->(:Pathway)`
- `(:Gene)-[:TARGETED_BY {interaction_type, pmids, approval_status, score}]->(:Drug)`
- `(:CellType)-[:OBSERVED_IN]->(:Context)` *(derived, optional)*

**Constraints/indexes:** unique `Gene.symbol`; index `CellType.name`, `Pathway.name`, `Drug.name`.

**The "non-obvious connection" query** — a path between two genes (or a gene and a context) with **no direct edge**, e.g.:
```cypher
MATCH p = shortestPath(
  (a:Gene {symbol:$a})-[:MEMBER_OF|TARGETED_BY|MARKER_FOR*..6]-(b:Gene {symbol:$b})
)
WHERE NOT (a)--(b)          // exclude trivial direct links
RETURN p
```
Plus **Neo4j GDS** for a real algorithm: degree/betweenness **centrality** to rank hub genes within a context, and (optional) community detection over the gene–pathway projection to name modules. This is what makes the graph "reason," not just store.

## 6. Architecture & data flow

```
React UI (Butterbase-hosted, butterbase.dev)
      │  question + auth token
      ▼
Butterbase Function  ── checks subscription (free vs Pro gate) ──► 402 if deep feature & free
      │  authorized call
      ▼
RocketRide Cloud pipeline (cloud.rocketride.ai)
      │  1. intent + entity extraction (which genes/contexts)
      │  2. plan traversal → 3. execute typed Cypher tools ──► Neo4j (Aura)
      │  4. synthesize dossier (Claude via Butterbase AI gateway)
      ▼
  returns { answer, graph_path, cited_edges }
      │
      ├─► Butterbase DB: log query, save dossier
      ├─► Cognee: remember(gene, context, hypothesis)   [Pro]
      └─► Daytona: sandbox runs scanpy diff-expr on seeded .h5ad, returns plot  [Pro]
```

### Agent tools (typed Cypher — pre-registered for reliability, not free-form Cypher)
1. `resolve_gene(name)` → canonical node + identifiers
2. `gene_neighborhood(gene, depth)` → 1–2 hop context
3. `connect_genes(a, b)` → shortest paths, direct links excluded, with explanation
4. `gene_in_context(gene, context)` → paths linking a gene to a tissue/celltype/condition
5. `drugs_for_gene(gene)` / `genes_for_drug(drug)`
6. `hub_genes(context)` → GDS centrality ranking
7. `verify_in_data(gene, dataset)` → **Daytona**: differential expression on seeded `.h5ad`

> Reliability decision: register 5–8 typed queries with slot-filling rather than have the LLM emit raw Cypher. Lower flexibility, much lower demo risk. The agent *chooses and fills* tools; it doesn't hand-write graph queries live.

## 7. Butterbase backend

- **Auth:** Butterbase email + OAuth (Google) for the demo login.
- **Payment:** Butterbase billing / Stripe (test mode). Two plans: **Free** (≤5 queries/day, 1-hop connections only) and **Pro** (unlimited, multi-hop deep dossiers, Daytona verify, Cognee memory). A Butterbase function checks plan status and returns `402` for deep features on Free — the UI shows an upgrade CTA → checkout → status flips → features unlock. This is the live "payment actively used" beat.
- **Schema (Butterbase Postgres):**
  - `users` (managed by auth)
  - `subscriptions` (user_id, plan, stripe_status) — from billing
  - `queries` (id, user_id, question, result_summary, created_at)
  - `dossiers` (id, user_id, gene, context, content_json, created_at)
- **AI gateway:** Claude for intent extraction + dossier synthesis (no separate key management).
- **Storage:** seeded `.h5ad` fixtures + generated verification plots.

## 8. Demo script (~90 seconds)

1. Log in (Butterbase auth). Ask: *"Does GENE-X matter in Alzheimer's entorhinal cortex? I know its role in immune cells, not here."*
2. Agent (RocketRide → Neo4j) traverses and **renders the path lighting up**: GENE-X → microglia marker → shared pathway P → GENE-Y (AD-neuron marker) → shared drug target. Answer: *"GENE-X reaches AD biology via pathway P and shares a drug target with GENE-Y — not directly annotated anywhere."*
3. Hit a **Pro-only** action (deep dossier + verify) on the Free account → upgrade CTA → **Stripe checkout** → Pro unlocked.
4. **Daytona** sandbox runs a scanpy diff-expression on `leng2021_ec.h5ad` → returns GENE-X expression AD vs control as a plot. "Not just asserted — computed."
5. Close the tab; reopen next "session" → **Cognee** recalls the research thread ("last time you explored GENE-X in AD via pathway P…").

## 9. Build sequence & time budget (order = mandatory first, bonuses last)

| # | Task | Est |
|---|---|---|
| 0 | Provision Butterbase app + Neo4j Aura Free + repo scaffold + RocketRide VS Code project | 0.5h |
| 1 | **ETL** — parse PanglaoDB + gene sets + DGIdb → Neo4j (harmonize IDs, create nodes/edges/indexes) | 2.5h |
| 2 | **RocketRide** pipeline + typed Cypher tools; **deploy to cloud.rocketride.ai** | 2.5h |
| 3 | **Butterbase** — auth, schema, subscription gate function calling RocketRide | 1.5h |
| 4 | **Frontend** — chat + graph-path viz (self-contained lib, e.g. cytoscape/react-force-graph); deploy to `butterbase.dev` | 1.5h |
| 5 | 🎁 **Daytona** `verify_in_data` tool | 1.0h |
| 6 | 🎁 **Cognee** memory (open-source, Neo4j backend) | 1.0h |
| 7 | Seed gold-path demo questions, polish, submit (`ENJOY0707` / `HackwithBay-0707`) | 1.0h |

**Cut-lines (drop in this order under time pressure):** Cognee → Daytona → GDS centrality → graph-viz polish. The mandatory spine (Butterbase auth+DB+payment, Neo4j traversal, RocketRide Cloud endpoint, one working demo question) must land first and is protected.

## 10. Risks & mitigations

- **Gene-ID mismatch across sources** → run the existing harmonizer upfront; canonical = symbol; drop unresolvable rows. *Low risk.*
- **Live Cypher instability** → pre-registered typed queries, not free-form generation. *Mitigated by design.*
- **RocketRide Cloud deploy friction** → deploy an empty pipeline first (task 2 start), iterate against the live endpoint. *Front-loaded.*
- **Graph viz eats time** → only the path-highlight is must-have; everything else is a plain list. *Scoped.*
- **Disease/context layer accuracy** → keep `Context` lightweight and clearly demo-scoped (Alzheimer's from `leng2021`); don't claim a curated disease ontology. *Honest scoping.*
- **8h is tight for one person** → mandatory-first ordering + explicit cut-lines guarantee a submittable demo even if bonuses are dropped.

## 11. Success criteria

- [ ] Deployed on `butterbase.dev` with working auth, and a Free→Pro Stripe upgrade that actually gates a feature.
- [ ] Neo4j answers at least one multi-hop "non-obvious connection" question via traversal (+ one GDS algorithm call).
- [ ] RocketRide pipeline running as a managed endpoint on `cloud.rocketride.ai`, called by the app.
- [ ] (Bonus) Daytona sandbox returns a real computed plot; (Bonus) Cognee recalls across sessions.
- [ ] The 90-second demo runs start-to-finish on seeded data with no live external dependency.
