import { useEffect, useRef, useState } from "react";
import {
  getInsights, perceive, getMyCheckins, currentUser, login, signup, logout,
  getReckoning, isPro, upgradeToPro,
  DEMO_NOW, type Insights, type PerceiveResult, type User, type CheckIn, type Reckoning,
} from "./api";

const STATUS_META: Record<string, { color: string; label: string }> = {
  fulfilled: { color: "#3fb950", label: "done" },
  "present-no-output": { color: "#d29922", label: "present, no output" },
  skipped: { color: "#f85149", label: "skipped" },
};

const SAMPLES = [
  { name: "At a desk", url: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=640" },
  { name: "Exercising", url: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=640" },
  { name: "Eating", url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=640" },
];

export default function App() {
  const [ins, setIns] = useState<Insights | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(currentUser());
  const [authOpen, setAuthOpen] = useState(false);
  const [reckoning, setReckoning] = useState<Reckoning | null>(null);
  const [pro, setPro] = useState(false);

  useEffect(() => {
    getInsights(DEMO_NOW).then(setIns).catch((e) => setErr(String(e)));
    getReckoning().then(setReckoning);
  }, []);

  useEffect(() => {
    if (!user) { setPro(false); return; }
    isPro().then(setPro);
    if (new URLSearchParams(location.search).get("upgraded")) {
      history.replaceState({}, "", location.pathname);
    }
  }, [user]);

  const stall = ins?.stall?.[0];
  const maxHours = Math.max(1, ...(ins?.timeByLabel.map((t) => t.hours) ?? [1]));
  const maxOut = Math.max(1, ...(ins?.misalignment.map((m) => m.outputs) ?? [1]));

  return (
    <div className="wrap">
      <header>
        <div className="logo">◆ Groundtruth</div>
        <div className="tag">Does your day match your intentions?</div>
        <div className="auth-slot">
          {user
            ? <><span className="who">{user.email}</span><button className="ghost" onClick={async () => { await logout(); setUser(null); }}>Log out</button></>
            : <button onClick={() => setAuthOpen(true)}>Log in</button>}
        </div>
      </header>

      {err && <div className="card err">Couldn’t load insights: {err}</div>}

      {stall && (
        <div className="hero">
          <div className="hero-k">Your #1 goal</div>
          <div className="hero-goal">“{stall.goal}”</div>
          <div className="hero-stat">hasn’t advanced in <b>{stall.daysSince} days</b></div>
          <div className="hero-sub">last touched {stall.lastAdvanced.slice(0, 10)} · week of Jun 29</div>
        </div>
      )}

      <ReckoningCard reckoning={reckoning} user={user} pro={pro}
        onRequireAuth={() => setAuthOpen(true)} onUpgraded={() => isPro().then(setPro)} />

      <LivePanel user={user} onRequireAuth={() => setAuthOpen(true)} />

      <section className="grid">
        <div className="card">
          <h2>Intention vs. reality</h2>
          <p className="hint">Each plan item, reconciled against what the camera saw and what you shipped.</p>
          <ul className="recon">
            {ins?.reconciliation.map((r, i) => {
              const m = STATUS_META[r.status];
              return (
                <li key={i}>
                  <span className="dot" style={{ background: m.color }} />
                  <span className="rdate">{r.date.slice(5)}</span>
                  <span className="rtitle">{r.title}</span>
                  <span className="rstatus" style={{ color: m.color }}>{m.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card">
          <h2>Where your effort actually went</h2>
          <p className="hint">Output per goal — vs. the priority you gave it.</p>
          {ins?.misalignment.map((m, i) => (
            <div className="bar-row" key={i}>
              <span className="bar-label">#{m.priority} {m.goal}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(m.outputs / maxOut) * 100}%` }} /></div>
              <span className="bar-val">{m.outputs}</span>
            </div>
          ))}
          <p className="hint mt">Your stated #1 goal has the fewest artifacts. The graph doesn’t lie.</p>
        </div>

        <div className="card">
          <h2>Where the hours went</h2>
          <p className="hint">Total time by activity, this week.</p>
          {ins?.timeByLabel.map((t, i) => (
            <div className="bar-row" key={i}>
              <span className="bar-label">{t.label}</span>
              <div className="bar-track"><div className="bar-fill alt" style={{ width: `${(t.hours / maxHours) * 100}%` }} /></div>
              <span className="bar-val">{t.hours.toFixed(1)}h</span>
            </div>
          ))}
        </div>
      </section>

      <footer>Butterbase · Neo4j · RocketRide — reasoning over a live graph, not flat rows.</footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onAuthed={(u) => { setUser(u); setAuthOpen(false); }} />}
    </div>
  );
}

function LivePanel({ user, onRequireAuth }: { user: User | null; onRequireAuth: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camOn, setCamOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PerceiveResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckIn[]>([]);

  useEffect(() => { if (user) getMyCheckins().then(setHistory); else setHistory([]); }, [user]);

  async function startCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      setCamOn(true);
    } catch { setErr("No webcam — use a sample below."); }
  }

  async function captureAndSend() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    await send({ image_base64: c.toDataURL("image/jpeg", 0.7).split(",")[1] });
  }

  async function send(input: { image_base64?: string; image_url?: string }) {
    setBusy(true); setErr(null); setRes(null);
    try {
      setRes(await perceive(input));
      getMyCheckins().then(setHistory);
    } catch (e) { setErr(String(e).replace("Error: ", "")); }
    finally { setBusy(false); }
  }

  if (!user) {
    return (
      <section className="card live locked">
        <div>
          <h2>See me right now</h2>
          <p className="hint">Log in to run the live camera on yourself — Groundtruth reads a frame, drops it into your graph, and reasons about it against your plan.</p>
          <button onClick={onRequireAuth}>Log in to try it</button>
        </div>
      </section>
    );
  }

  return (
    <section className="card live">
      <div className="live-left">
        <h2>See me right now</h2>
        <p className="hint">Reads a live frame, drops it into the graph at this moment, and reasons about it against what you planned.</p>
        <video ref={videoRef} className={camOn ? "cam on" : "cam"} muted playsInline />
        <div className="live-actions">
          {!camOn
            ? <button onClick={startCam}>Turn on camera</button>
            : <button onClick={captureAndSend} disabled={busy}>{busy ? "Reading…" : "Read this frame"}</button>}
        </div>
        <div className="samples">
          <span className="hint">or a sample:</span>
          {SAMPLES.map((s) => (
            <button key={s.name} className="chip" disabled={busy} onClick={() => send({ image_url: s.url })}>{s.name}</button>
          ))}
        </div>
        {history.length > 0 && (
          <div className="history">
            <span className="hint">your recent check-ins (RLS-scoped to you):</span>
            <ul>
              {history.map((h) => (
                <li key={h.id}><b>{h.label}</b> <span className="hdim">{h.reason}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="live-right">
        {busy && <div className="thinking">reasoning over the graph…</div>}
        {err && <div className="err">{err}</div>}
        {res && (
          <div className={`nudge ${res.severity}`}>
            <div className="nudge-label">{res.label}{res.confidence != null && <span className="conf"> · {(res.confidence * 100).toFixed(0)}%</span>}</div>
            <div className="nudge-body">{res.nudge}</div>
            {res.intended && <div className="nudge-plan">planned now: <b>{res.intended}</b></div>}
          </div>
        )}
        {!busy && !res && !err && <div className="thinking idle">waiting for a frame…</div>}
      </div>
    </section>
  );
}

function ReckoningCard({ reckoning, user, pro, onRequireAuth }: {
  reckoning: Reckoning | null; user: User | null; pro: boolean;
  onRequireAuth: () => void; onUpgraded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upgrade() {
    if (!user) { onRequireAuth(); return; }
    setBusy(true); setErr(null);
    try { location.href = await upgradeToPro(); }
    catch (e) { setErr(String(e).replace("Error: ", "")); setBusy(false); }
  }

  return (
    <section className="card reckoning">
      <div className="reck-head">
        <h2>Your weekly Reckoning</h2>
        <span className={pro ? "badge pro" : "badge"}>{pro ? "PRO" : "Pro"}</span>
      </div>
      <p className="hint">An accountability coach reads your reconciled graph and tells you the truth — powered by a RocketRide Cloud pipeline.</p>

      {!reckoning && <div className="thinking idle">your coach is preparing the first reckoning…</div>}

      {reckoning && pro && (
        <>
          <blockquote className="reck-text">{reckoning.narrative}</blockquote>
          <div className="reck-meta">via {reckoning.model} · week of {reckoning.week_of}</div>
        </>
      )}

      {reckoning && !pro && (
        <div className="reck-lock">
          <blockquote className="reck-text blurred">{reckoning.narrative}</blockquote>
          <div className="reck-cta">
            <div>
              <div className="cta-title">🔒 Unlock your Reckoning</div>
              <div className="hint">Groundtruth Pro — $9/mo · coaching, unlimited live check-ins, full history.</div>
              {err && <div className="err">{err}</div>}
            </div>
            <button onClick={upgrade} disabled={busy}>{busy ? "…" : user ? "Upgrade to Pro" : "Log in to upgrade"}</button>
          </div>
        </div>
      )}
    </section>
  );
}

function AuthModal({ onClose, onAuthed }: { onClose: () => void; onAuthed: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const u = mode === "signup" ? await signup(email, password, name || undefined) : await login(email, password);
      onAuthed(u);
    } catch (e) { setErr(String(e).replace("Error: ", "")); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === "signup" ? "Create account" : "Log in"}</h2>
        {mode === "signup" && <input placeholder="name (optional)" value={name} onChange={(e) => setName(e.target.value)} />}
        <input placeholder="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {mode === "signup" && <p className="hint">8+ chars with upper, lower, number, and a symbol.</p>}
        {err && <div className="err">{err}</div>}
        <button onClick={submit} disabled={busy || !email || !password}>{busy ? "…" : mode === "signup" ? "Sign up" : "Log in"}</button>
        <p className="switch" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setErr(null); }}>
          {mode === "signup" ? "Have an account? Log in" : "New here? Create an account"}
        </p>
      </div>
    </div>
  );
}
