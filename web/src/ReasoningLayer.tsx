// Replaces the graph visualization. The point isn't to LOOK at a graph — it's
// why storing life data as a connected, accumulating graph lets a reasoning
// layer notice things no single day reveals. Self-contained scoped styles.

const PATTERNS = [
  {
    tag: "Early wellbeing signals",
    t: "“Something’s been off for two weeks.”",
    d: "Skipped social plans, more sleep, less movement, shorter messages. No single day means anything — but connected across two weeks they trace a slope worth paying attention to. Gently surfaced, so you can check in with yourself or someone. Never a diagnosis.",
  },
  {
    tag: "Burnout trajectory",
    t: "The slope before the crash.",
    d: "Deep-work hours creeping up while exercise drops and nights run later. The reasoning layer follows that chain across weeks and flags the trend while it’s still reversible.",
  },
  {
    tag: "Attention triggers",
    t: "“Your focus collapses when the side project heats up.”",
    d: "A correlation invisible day-to-day becomes obvious once the graph links output, activity, and context over a month. Now it’s a known trigger, not a mystery.",
  },
  {
    tag: "Predictable slacking",
    t: "The Friday fade.",
    d: "You reliably drift every Friday afternoon. The graph has seen it happen a dozen times — so instead of guilt, you get a heads-up before it happens again.",
  },
];

export default function ReasoningLayer() {
  return (
    <section className="card rl">
      <style>{`
        .rl { background: linear-gradient(160deg,#141a2b,var(--panel)); }
        .rl-ey { font-size:12px; font-weight:600; letter-spacing:.09em; text-transform:uppercase; color:#9db4d6; }
        .rl h2 { font-size:clamp(20px,2.6vw,26px); letter-spacing:-0.01em; margin:8px 0 8px; }
        .rl-lead { color:#c6d2e0; max-width:70ch; line-height:1.6; margin:0 0 6px; }
        .rl-lead b { color:#fff; }
        .rl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; margin-top:18px; }
        .rl-c { border:1px solid var(--line); border-radius:12px; padding:15px 16px; background:#0e1420; }
        .rl-c .tag { font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#8fb8ff; }
        .rl-c .tt { font-size:15.5px; font-weight:600; margin:5px 0 6px; line-height:1.3; }
        .rl-c p { margin:0; font-size:13px; color:var(--dim); line-height:1.5; }
        .rl-why { margin-top:18px; display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .rl-why div { border-left:3px solid var(--accent2); padding:2px 0 2px 12px; }
        .rl-why b { font-size:14px; }
        .rl-why p { margin:4px 0 0; font-size:13px; color:var(--dim); line-height:1.5; }
        .rl-chain { margin-top:16px; font-size:13px; color:#c6d2e0; background:#0e1420; border:1px solid var(--line); border-radius:12px; padding:14px 16px; line-height:1.6; }
        .rl-chain code { color:#8fb8ff; background:#ffffff08; padding:1px 6px; border-radius:5px; font-size:12.5px; }
        @media (max-width:760px){ .rl-why { grid-template-columns:1fr; } }
      `}</style>

      <div className="rl-ey">The reasoning layer</div>
      <h2>Why store your life as a graph? So it can reason over it.</h2>
      <p className="rl-lead">
        One day of data is noise. But stored as a <b>connected, accumulating graph</b> — activities linked
        to intentions linked to goals across months — it becomes something a reasoning layer can actually
        think with. <b>GraphRAG</b> retrieves along those relationships, so the agent notices patterns that
        never appear in any single day.
      </p>

      <div className="rl-grid">
        {PATTERNS.map((p) => (
          <div className="rl-c" key={p.tag}>
            <div className="tag">{p.tag}</div>
            <div className="tt">{p.t}</div>
            <p>{p.d}</p>
          </div>
        ))}
      </div>

      <div className="rl-chain">
        A vector search finds moments that <i>sound</i> similar. GraphRAG follows the <b>relationships between them over time</b> — so the agent can connect
        <code>less exercise</code> → <code>worse sleep</code> → <code>lower output</code> → <code>withdrawn</code>
        into one explainable chain, and show you the path it walked to get there.
      </div>

      <div className="rl-why">
        <div>
          <b>Insight, not just recall</b>
          <p>A to-do list remembers tasks. A life graph reasons across them — cause and effect, trend and trigger, weeks apart.</p>
        </div>
        <div>
          <b>Traceable, because it’s your wellbeing</b>
          <p>Every observation comes with the path that produced it. When the subject is your mental state, a black-box vibe isn’t good enough — the graph shows its work.</p>
        </div>
      </div>
    </section>
  );
}
