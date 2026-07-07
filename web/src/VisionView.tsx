// The pitch: why Groundtruth is built on a graph, what works today, and where
// it goes. Self-contained (scoped styles below) so it can't collide with other
// panels' CSS. Honest split between "live now" and "unlocked next" — the graph
// is the memory substrate that compounds; a week proves the loop, years prove
// the product.

const LIVE_NOW = [
  { icon: "📷", title: "Live perception", body: "A camera frame → activity label via the Butterbase AI gateway, dropped into the graph at 'now' and reasoned against your plan in seconds." },
  { icon: "🕸️", title: "Life graph in Neo4j", body: "Goals, projects, intentions, activities, artifacts — connected, not rows. Reconciliation is a graph traversal: Intention → Activity → Artifact." },
  { icon: "⚖️", title: "Intention vs. reality", body: "Every plan item gets a verdict — done, present-but-no-output, skipped — by joining what the camera saw with what you actually shipped." },
  { icon: "🧨", title: "The weekly Reckoning", body: "A RocketRide Cloud pipeline reads the reconciled graph and coaches you bluntly: the gap, the numbers, one action for tomorrow." },
  { icon: "🔐", title: "Real product plumbing", body: "Auth-gated personal history (RLS), stored labelled frames, and a paid Pro tier — a monetizable product, not a demo script." },
];

const WHY_GRAPH = [
  {
    q: "Why not a table?",
    a: "A day is not rows — it's relationships. \"Did the 9am block advance the thesis?\" touches an intention, a time window, an activity span, an artifact, a project, and a goal. In SQL that's a pile of JOINs that gets worse every month. In the graph it's one path.",
  },
  {
    q: "Why does memory need to compound?",
    a: "An assistant that forgets yesterday is a chatbot. Every day of perception adds nodes that connect to everything before them — patterns like \"you always drift after lunch\" or \"this goal stalls every time that project heats up\" only exist across weeks of connected history.",
  },
  {
    q: "Why GraphRAG and not vector search?",
    a: "Vector RAG finds things that sound similar. Your life needs answers that follow relationships: \"what did I trade my thesis time for, and was it worth it?\" is a multi-hop traversal with an explainable path — the agent can show its reasoning, hop by hop.",
  },
];

const UNLOCKED = [
  { when: "next", title: "Ask your history anything", body: "\"When do I actually do deep work?\" \"What did I do the last time I broke a stall?\" — GraphRAG over months of accumulated context, with the path as the receipt." },
  { when: "next", title: "Agent memory via Cognee", body: "Reflections, decisions and stated priorities cognified into the same Neo4j graph — the assistant remembers what you told it, across sessions, and connects it to what you did." },
  { when: "then", title: "A planner that knows you", body: "Tomorrow's plan drafted from your real patterns — when you focus, what you skip, what a realistic Tuesday looks like — not from a template." },
  { when: "then", title: "Private, always-on perception", body: "The tiered on-device design: cheap local models watch continuously, frames are discarded on-device, only labels persist — the expensive brain wakes only when something's worth reasoning about." },
  { when: "then", title: "Everything routes through it", body: "Calendar, commits, tasks, comms — each a signal stream into one life graph. The assistant stops being an app you check and becomes the layer that keeps your days pointed at your goals." },
];

export default function VisionView() {
  return (
    <section className="card vision">
      <style>{`
        .vision h2 { margin-bottom: 4px; }
        .vision .v-tag { color: var(--dim); font-size: 13px; margin: 0 0 18px; }
        .vision h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--dim); margin: 22px 0 10px; }
        .v-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
        .v-cap { background: var(--panel2); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
        .v-cap b { display: block; font-size: 14px; margin-bottom: 3px; }
        .v-cap span.ic { margin-right: 6px; }
        .v-cap p { margin: 0; font-size: 12.5px; color: var(--dim); line-height: 1.45; }
        .v-why { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
        .v-why div { border-left: 3px solid var(--accent2); padding: 2px 0 2px 12px; }
        .v-why b { font-size: 14px; }
        .v-why p { margin: 4px 0 0; font-size: 13px; color: var(--text); opacity: 0.85; line-height: 1.5; }
        .v-road { list-style: none; margin: 0; padding: 0; }
        .v-road li { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line); align-items: baseline; }
        .v-road li:last-child { border-bottom: 0; }
        .v-when { flex: none; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; }
        .v-when.next { background: #1f3a5f; color: #9ecbff; }
        .v-when.then { background: #2a2440; color: #c3a6ff; }
        .v-road b { font-size: 13.5px; }
        .v-road p { margin: 2px 0 0; font-size: 12.5px; color: var(--dim); line-height: 1.45; }
        .v-thesis { background: linear-gradient(135deg, #1c1530, var(--panel2)); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; font-size: 14.5px; line-height: 1.6; }
        .v-thesis b { color: var(--accent2); }
      `}</style>

      <h2>Why a graph — and where this goes</h2>
      <p className="v-tag">The demo shows one week. The product is what happens when it never stops.</p>

      <div className="v-thesis">
        Your day-to-day life is the messiest dataset you own — intentions, activities, output,
        goals, all tangled together. Groundtruth's bet: store it as a <b>graph that compounds</b>.
        Every day adds connected context; every month makes the assistant smarter about <i>you</i>.
        That accumulated, traversable memory — <b>GraphRAG over your own life</b> — is what turns
        a productivity dashboard into an assistant that actually knows what your time is for.
      </div>

      <h3>Live in this demo</h3>
      <div className="v-grid">
        {LIVE_NOW.map((c) => (
          <div className="v-cap" key={c.title}>
            <b><span className="ic">{c.icon}</span>{c.title}</b>
            <p>{c.body}</p>
          </div>
        ))}
      </div>

      <h3>Why relationships beat rows</h3>
      <div className="v-why">
        {WHY_GRAPH.map((w) => (
          <div key={w.q}>
            <b>{w.q}</b>
            <p>{w.a}</p>
          </div>
        ))}
      </div>

      <h3>What accumulated graph memory unlocks</h3>
      <ul className="v-road">
        {UNLOCKED.map((u) => (
          <li key={u.title}>
            <span className={`v-when ${u.when}`}>{u.when === "next" ? "Next" : "Vision"}</span>
            <div>
              <b>{u.title}</b>
              <p>{u.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
