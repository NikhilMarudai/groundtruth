# ◆ Groundtruth

**A graph-aware daily-accountability agent.** It reconciles what you *intended* against what you
*actually did* — reasoning over a **life graph**, not flat rows — and can read a live camera frame,
drop it into that graph in real time, and tell you the truth about your day.

🔗 **Live demo:** https://groundtruth.butterbase.dev
🏆 Built for **HackwithBay 3.0** — *Building Graph-Aware Agentic Applications with Butterbase, Neo4j, and RocketRide Cloud.*

---

## The idea

Intentions and follow-through drift apart. You plan a deep-work morning and three hours later you
can't say where it went. Calendars nag but are blind to what you actually did; screen-trackers are
blind to the physical world. Groundtruth reconciles three signals — **what you intended**, **what
you physically did** (a vision model labels your activity), and **whether real output happened**
(commits/tasks) — and reasons over the *gaps*.

Being at the desk isn't the same as shipping. The graph knows the difference.

## Why a graph (the real bet)

A life is relationship-shaped. "Did the 9am block advance the thesis?" touches an intention, a time
window, an activity span, an artifact, a project, and a goal — **one Cypher path, not a pile of
JOINs**. And graph memory *compounds*: every day of perception adds connected context, and the
questions that matter ("when do I actually do deep work?", "what did I trade my thesis time for?")
are multi-hop traversals with the path as an explainable receipt.

## Architecture — the three mandatory technologies, load-bearing

```
        Neo4j (life graph)                RocketRide Cloud                 Butterbase
   ┌────────────────────────┐        ┌──────────────────────┐      ┌───────────────────────┐
   │ Goal · Project ·       │  facts │  "The Reckoning"     │ text │ DB · Auth · Payment · │
   │ Intention · Activity · │───────▶│  agent + LLM pipeline│─────▶│ AI gateway · Storage ·│
   │ Artifact · Day         │        │  (LLM on BB gateway) │      │ Hosting (demo URL)    │
   └────────────────────────┘        └──────────────────────┘      └───────────────────────┘
          ▲  live Cypher traversals over the Aura HTTPS Query API from Butterbase functions
```

| Tech | Role — not bolted on |
|---|---|
| **Butterbase** | The whole backend: Postgres (`camera_events`, `nudges`, `reckonings`, subscriptions, all RLS-isolated), email **auth**, **payment** (Groundtruth Pro gating the Reckoning), the **AI gateway** (powers *both* vision and the RocketRide LLM node — one credit pool), Storage (labelled frames), and hosting the frontend + serverless functions (`insights`, `perceive`, `graph`, `day`). |
| **Neo4j** | The life graph. Every insight on screen is a **live traversal** — reconciliation (datetime-window overlap + artifact existence), multi-hop goal-misalignment (`Artifact→Project→Goal` vs stated priority), top-goal stall (`duration.inDays` up the goal path), and the live camera context. Not a KV store. |
| **RocketRide Cloud** | `the-reckoning.pipe` (`chat → agent → llm_openai_api → answers`) deployed to `api.rocketride.ai`, invoked via the `rocketride` SDK. It turns reconciled graph facts into a blunt weekly **Reckoning** with one action for tomorrow. Remove it and there's no coach — just numbers. |

Cognee / Daytona: not integrated (see [`docs/submission.md`](docs/submission.md) for the honest rationale + Cognee roadmap).

## Repo layout
| Dir | What |
|---|---|
| `seed/` | Deterministic synthetic-week generator → the demo's graph data (JSON) |
| `graph/` | Neo4j model + loader + the reconciliation / misalignment / stall queries |
| `backend/` | Butterbase app: schema, auth + RLS, payment, serverless functions |
| `pipeline/` | RocketRide Cloud pipeline (`the-reckoning.pipe`) + the worker (`reckon.mjs`) |
| `web/` | React + Vite frontend, deployed to `groundtruth.butterbase.dev` |
| `docs/submission.md` | Full submission writeup (problem, graph model, integration detail, demo script) |

## Run the data + reasoning locally
```bash
node seed/generate.mjs                          # generate the synthetic week
NEO4J_URI=… NEO4J_PASSWORD=… npm --prefix graph run load       # load the life graph
NEO4J_URI=… NEO4J_PASSWORD=… npm --prefix graph run insights   # print reconciliation/misalignment/stall from Cypher
set -a; source .env; set +a && node pipeline/reckon.mjs        # run the RocketRide reckoning
```

See [`docs/submission.md`](docs/submission.md) for the full writeup and 90-second demo script.
