// The "movie poster" — a cinematic top-of-page landing that sells the vision:
// a personal system that SEES your day, REMEMBERS it as a compounding graph,
// and COACHES you back on track. Built for screen-recording. Self-contained
// scoped styles + CSS-only motion (no deps).

const LOOP = [
  { n: "01", icon: "👁️", t: "It sees you", d: "Your camera — or your screen — reads what you're actually doing, moment to moment. Heads-down in the IDE, or three tabs deep in YouTube? Presence isn't productivity. It knows the difference." },
  { n: "02", icon: "🕸️", t: "It remembers", d: "Every moment becomes a node in a living graph — activities, intentions, goals, output, all connected. Neo4j + GraphRAG turn your messy days into memory that's queryable, explainable, and compounds over time." },
  { n: "03", icon: "🧭", t: "It coaches you", d: "It reconciles what you planned against what you did and tells you the truth: where the hours went, the goal you're quietly avoiding, and the one thing to do next. A life coach that runs on your real data — not platitudes." },
];

const BECOMES = [
  { icon: "🧠", t: "Your second brain", d: "Ask your own history anything — \"when do I actually do deep work?\" — answered across months of connected context." },
  { icon: "🗓️", t: "Your planner", d: "Tomorrow drafted from how you really work: when you focus, what you skip, what a realistic day looks like." },
  { icon: "🎯", t: "Your accountability", d: "A quiet system that notices the drift before you do, and points you back at what you said mattered." },
  { icon: "🌊", t: "Your ambient layer", d: "Calendar, commits, comms — every signal into one life graph. Not an app you check; the layer your days run on." },
];

export default function LandingHero() {
  return (
    <section className="landing">
      <style>{`
        .landing { position: relative; overflow: hidden; border-radius: 20px; border: 1px solid var(--line);
          background: radial-gradient(900px 500px at 15% -20%, #24325a 0%, #0d111700 55%),
                      radial-gradient(800px 500px at 100% 0%, #3a2350 0%, #0d111700 50%), #0b0e14;
          padding: 56px 40px 44px; margin-bottom: 20px; }
        .landing::before { content:""; position:absolute; inset:-40%; z-index:0;
          background: conic-gradient(from 0deg, #6ea8fe22, #a371f722, #3fb95022, #6ea8fe22);
          filter: blur(80px); animation: gtspin 22s linear infinite; opacity:.5; }
        @keyframes gtspin { to { transform: rotate(360deg); } }
        .landing > * { position: relative; z-index: 1; }
        @keyframes gtup { from { opacity:0; transform: translateY(14px);} to { opacity:1; transform:none; } }
        .l-in { animation: gtup .7s both; }
        .l-eyebrow { display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:600;
          letter-spacing:.1em; text-transform:uppercase; color:#9db4d6;
          border:1px solid var(--line); background:#ffffff08; padding:6px 12px; border-radius:20px; }
        .l-dot { width:7px; height:7px; border-radius:50%; background:#3fb950; box-shadow:0 0 0 0 #3fb95088; animation: gtpulse 2s infinite; }
        @keyframes gtpulse { 0%{box-shadow:0 0 0 0 #3fb95088;} 70%{box-shadow:0 0 0 8px #3fb95000;} 100%{box-shadow:0 0 0 0 #3fb95000;} }
        .l-h1 { font-size: clamp(30px, 5vw, 52px); line-height:1.05; letter-spacing:-0.02em; font-weight:800; margin:18px 0 0; max-width:16ch; }
        .l-h1 b { background:linear-gradient(90deg,#8fb8ff,#c39bff); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .l-sub { font-size: clamp(15px,2vw,19px); color:#c6d2e0; max-width:60ch; margin:18px 0 0; line-height:1.55; }
        .l-scroll { margin-top:22px; color:#9db4d6; font-size:13px; display:inline-flex; gap:8px; align-items:center; }
        .l-scroll .a { animation: gtbob 1.6s ease-in-out infinite; }
        @keyframes gtbob { 50% { transform: translateY(4px); } }

        .l-loop { display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-top:36px; }
        .l-step { background:#0f1420cc; border:1px solid var(--line); border-radius:14px; padding:18px 18px 20px; }
        .l-step .l-n { font-size:12px; font-weight:700; color:#5f6b7e; letter-spacing:.1em; }
        .l-step .l-ic { font-size:26px; margin:6px 0 8px; }
        .l-step h3 { margin:0 0 6px; font-size:17px; }
        .l-step p { margin:0; font-size:13px; color:var(--dim); line-height:1.5; }

        .l-bet { margin-top:22px; display:flex; align-items:center; gap:18px; flex-wrap:wrap;
          background:linear-gradient(135deg,#1a1530,#0f1420); border:1px solid var(--line); border-radius:14px; padding:18px 22px; }
        .l-bet .big { font-size:19px; font-weight:700; }
        .l-bet .big b { color:#c39bff; }
        .l-chain { display:flex; align-items:center; gap:10px; color:var(--dim); font-size:13px; flex-wrap:wrap; }
        .l-chain i { font-style:normal; padding:4px 10px; border:1px solid var(--line); border-radius:20px; background:#ffffff05; }
        .l-chain i:last-child { color:#c39bff; border-color:#5b3f86; }

        .l-becomes-h { margin:30px 0 12px; font-size:13px; text-transform:uppercase; letter-spacing:.09em; color:var(--dim); }
        .l-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; }
        .l-cell { border:1px solid var(--line); border-radius:12px; padding:14px 15px; background:#0f1420aa; }
        .l-cell .ic { font-size:20px; } .l-cell h4 { margin:6px 0 4px; font-size:14px; } .l-cell p { margin:0; font-size:12px; color:var(--dim); line-height:1.45; }

        @media (max-width: 820px) {
          .landing { padding:40px 22px 32px; }
          .l-loop, .l-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="l-in">
        <span className="l-eyebrow"><span className="l-dot" /> A personal system that sees your day · live</span>
        <h1 className="l-h1">You planned the day. <b>This is what you actually did.</b></h1>
        <p className="l-sub">
          Groundtruth watches your real day, reconciles it against what you meant to do, and coaches you
          back on track — building a living memory of your life that gets smarter every single day.
          Not a tracker you check. An assistant that actually knows where your time goes.
        </p>
        <div className="l-scroll"><span className="a">↓</span> It's live below — scroll to see your week, or read a frame right now.</div>
      </div>

      <div className="l-loop l-in" style={{ animationDelay: ".12s" }}>
        {LOOP.map((s) => (
          <div className="l-step" key={s.n}>
            <div className="l-n">{s.n}</div>
            <div className="l-ic">{s.icon}</div>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        ))}
      </div>

      <div className="l-bet l-in" style={{ animationDelay: ".2s" }}>
        <div className="big">A week is a demo. <b>Years are the product.</b></div>
        <div className="l-chain">
          Memory that compounds: <i>a day</i> → <i>a week</i> → <i>a month</i> → <i>a year of you</i>
        </div>
      </div>

      <div className="l-in" style={{ animationDelay: ".28s" }}>
        <div className="l-becomes-h">What it grows into</div>
        <div className="l-grid">
          {BECOMES.map((b) => (
            <div className="l-cell" key={b.t}>
              <div className="ic">{b.icon}</div>
              <h4>{b.t}</h4>
              <p>{b.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
