// "What it catches" — the story told through concrete problems. Each is a real
// failure mode of a normal day that Groundtruth surfaces because it can SEE what
// you actually did and traverse it against what you meant to do. Self-contained.

const CATCHES = [
  {
    tag: "Presence ≠ progress",
    quote: "You've been ‘at your desk’ for three hours. You shipped nothing.",
    problem: "Sitting down feels like working. Your calendar says deep work; your output says otherwise — and nothing tells you.",
    fix: "Reconciles the activity it saw against the artifacts you produced → flags the block ‘present, no output.’",
  },
  {
    tag: "Screen truth",
    quote: "‘Working’ was actually YouTube.",
    problem: "Even at the keyboard, focus leaks. Presence can't tell the IDE from a rabbit hole.",
    fix: "Reads your screen, not just your posture — the difference between building and browsing.",
  },
  {
    tag: "The quiet stall",
    quote: "Your #1 goal hasn’t moved in four days.",
    problem: "Goals don’t fail loudly. They stall one skipped morning at a time until a month is gone.",
    fix: "Walks Goal ← Project ← Artifact and measures days since it last advanced. The stall becomes visible while it’s still fixable.",
  },
  {
    tag: "Revealed priorities",
    quote: "You said the thesis mattered most. Your hours went to the side project.",
    problem: "What you value and what you do drift apart, and being busy hides it.",
    fix: "Ranks real output per goal against the priority you stated. The graph doesn’t flatter you.",
  },
  {
    tag: "The drift pattern",
    quote: "That’s your third leisure block before noon.",
    problem: "One distraction is a break. The same one every day is a pattern you can’t see from inside it.",
    fix: "Counts recurring activity across days and weeks — the shape of your habits, not just today.",
  },
  {
    tag: "Plans that evaporate",
    quote: "Gym at 5. You never left the chair.",
    problem: "Intentions quietly disappear. By the time you notice, it’s a streak of skipped ones.",
    fix: "Checks whether the activity that would fulfil each plan block ever actually happened → ‘skipped.’",
  },
];

const COMPOUNDS = [
  { q: "“When do I actually focus?”", a: "Answered from 90 days of your real patterns, not a guess." },
  { q: "“What did I do the last time I broke a stall?”", a: "Retrieved as a path through your own history." },
  { q: "“What does a realistic Tuesday look like for me?”", a: "Modelled from every Tuesday it has watched." },
];

export default function ScenariosView() {
  return (
    <section className="scen">
      <style>{`
        .scen { border:1px solid var(--line); border-radius:18px; background:#0c1017; padding:34px 30px; margin-bottom:20px; }
        .scen-ey { font-size:12px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#e07a7a; }
        .scen h2 { font-size:clamp(22px,3vw,30px); letter-spacing:-0.01em; margin:8px 0 6px; }
        .scen-sub { color:var(--dim); max-width:64ch; margin:0 0 22px; line-height:1.55; }
        .scen-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:14px; }
        .scen-c { border:1px solid var(--line); border-radius:14px; overflow:hidden; background:var(--panel); }
        .scen-c .top { padding:16px 18px; background:linear-gradient(180deg,#2a161688,#0d111700); border-bottom:1px solid var(--line); }
        .scen-c .tag { font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#e78d8d; }
        .scen-c .q { font-size:16px; font-weight:600; margin-top:6px; line-height:1.35; color:var(--text); }
        .scen-c .body { padding:14px 18px 16px; }
        .scen-c .prob { font-size:13px; color:var(--dim); line-height:1.5; }
        .scen-c .fix { font-size:13px; line-height:1.5; margin-top:10px; padding-top:10px; border-top:1px solid var(--line); }
        .scen-c .fix b { color:#7fdca0; }
        .scen-comp { margin-top:26px; background:linear-gradient(135deg,#141b2e,#0f1420); border:1px solid var(--line); border-radius:14px; padding:20px 22px; }
        .scen-comp h3 { margin:0 0 4px; font-size:16px; }
        .scen-comp .note { color:var(--dim); font-size:13px; margin:0 0 14px; }
        .scen-q { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px; }
        .scen-q div { border-left:3px solid var(--accent2); padding:2px 0 2px 12px; }
        .scen-q .qq { font-size:14px; font-weight:600; }
        .scen-q .aa { font-size:12.5px; color:var(--dim); margin-top:3px; line-height:1.45; }
        .scen-persona { margin-top:18px; font-size:12.5px; color:var(--dim); }
        .scen-persona b { color:#c6d2e0; font-weight:600; }
        @media (max-width:820px){ .scen{padding:26px 20px;} }
      `}</style>

      <div className="scen-ey">The problems it catches</div>
      <h2>Your day lies to you. It doesn’t.</h2>
      <p className="scen-sub">
        Most productivity tools trust what you tell them. Groundtruth watches what you actually do and
        checks it against what you meant to do — so the gaps you can’t see from inside your own day
        finally become visible.
      </p>

      <div className="scen-grid">
        {CATCHES.map((c) => (
          <div className="scen-c" key={c.tag}>
            <div className="top">
              <div className="tag">{c.tag}</div>
              <div className="q">{c.quote}</div>
            </div>
            <div className="body">
              <div className="prob">{c.problem}</div>
              <div className="fix"><b>Groundtruth:</b> {c.fix}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="scen-comp">
        <h3>And it only gets sharper</h3>
        <p className="note">Every day adds connected memory. The questions that are impossible on day one become one traversal by month three — GraphRAG over your own life.</p>
        <div className="scen-q">
          {COMPOUNDS.map((c) => (
            <div key={c.q}>
              <div className="qq">{c.q}</div>
              <div className="aa">{c.a}</div>
            </div>
          ))}
        </div>
        <div className="scen-persona">
          <b>For anyone whose intentions and hours drift</b> — founders, students, deep-work seekers,
          remote workers, and anyone who’s ever wondered where the day went.
        </div>
      </div>
    </section>
  );
}
