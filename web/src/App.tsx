import { useEffect, useRef, useState } from "react";
import {
  getInsights, perceive, DEMO_NOW,
  type Insights, type PerceiveResult,
} from "./api";

const STATUS_META: Record<string, { color: string; label: string }> = {
  fulfilled: { color: "#3fb950", label: "done" },
  "present-no-output": { color: "#d29922", label: "present, no output" },
  skipped: { color: "#f85149", label: "skipped" },
};

// Verified sample frames (used when the webcam isn't available on stage).
const SAMPLES = [
  { name: "At a desk", url: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=640" },
  { name: "Exercising", url: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=640" },
  { name: "Eating", url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=640" },
];

export default function App() {
  const [ins, setIns] = useState<Insights | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getInsights(DEMO_NOW).then(setIns).catch((e) => setErr(String(e)));
  }, []);

  const stall = ins?.stall?.[0];
  const maxHours = Math.max(1, ...(ins?.timeByLabel.map((t) => t.hours) ?? [1]));
  const maxOut = Math.max(1, ...(ins?.misalignment.map((m) => m.outputs) ?? [1]));

  return (
    <div className="wrap">
      <header>
        <div className="logo">◆ Jarvis</div>
        <div className="tag">Does your day match your intentions?</div>
      </header>

      {err && <div className="card err">Couldn’t load insights: {err}</div>}

      {stall && (
        <div className="hero">
          <div className="hero-k">Your #1 goal</div>
          <div className="hero-goal">“{stall.goal}”</div>
          <div className="hero-stat">
            hasn’t advanced in <b>{stall.daysSince} days</b>
          </div>
          <div className="hero-sub">last touched {stall.lastAdvanced.slice(0, 10)} · week of Jun 29</div>
        </div>
      )}

      <LivePanel />

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
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(m.outputs / maxOut) * 100}%` }} />
              </div>
              <span className="bar-val">{m.outputs}</span>
            </div>
          ))}
          <p className="hint mt">
            Your stated #1 goal has the fewest artifacts. The graph doesn’t lie.
          </p>
        </div>

        <div className="card">
          <h2>Where the hours went</h2>
          <p className="hint">Total time by activity, this week.</p>
          {ins?.timeByLabel.map((t, i) => (
            <div className="bar-row" key={i}>
              <span className="bar-label">{t.label}</span>
              <div className="bar-track">
                <div className="bar-fill alt" style={{ width: `${(t.hours / maxHours) * 100}%` }} />
              </div>
              <span className="bar-val">{t.hours.toFixed(1)}h</span>
            </div>
          ))}
        </div>
      </section>

      <footer>
        Butterbase · Neo4j · RocketRide — reasoning over a live graph, not flat rows.
      </footer>
    </div>
  );
}

function LivePanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camOn, setCamOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PerceiveResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function startCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      setCamOn(true);
    } catch (e) { setErr("No webcam — use a sample below."); }
  }

  async function captureAndSend() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const b64 = c.toDataURL("image/jpeg", 0.7).split(",")[1];
    await send({ image_base64: b64 });
  }

  async function send(input: { image_base64?: string; image_url?: string }) {
    setBusy(true); setErr(null); setRes(null);
    try { setRes(await perceive(input)); }
    catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  }

  return (
    <section className="card live">
      <div className="live-left">
        <h2>See me right now</h2>
        <p className="hint">
          The assistant reads a live frame, drops it into the graph at this moment,
          and reasons about it against what you planned.
        </p>
        <video ref={videoRef} className={camOn ? "cam on" : "cam"} muted playsInline />
        <div className="live-actions">
          {!camOn
            ? <button onClick={startCam}>Turn on camera</button>
            : <button onClick={captureAndSend} disabled={busy}>{busy ? "Reading…" : "Read this frame"}</button>}
        </div>
        <div className="samples">
          <span className="hint">or a sample:</span>
          {SAMPLES.map((s) => (
            <button key={s.name} className="chip" disabled={busy}
              onClick={() => send({ image_url: s.url })}>{s.name}</button>
          ))}
        </div>
      </div>
      <div className="live-right">
        {busy && <div className="thinking">reasoning over the graph…</div>}
        {err && <div className="err">{err}</div>}
        {res && (
          <div className={`nudge ${res.severity}`}>
            <div className="nudge-label">{res.label}
              {res.confidence != null && <span className="conf"> · {(res.confidence * 100).toFixed(0)}%</span>}
            </div>
            <div className="nudge-body">{res.nudge}</div>
            {res.intended && <div className="nudge-plan">planned now: <b>{res.intended}</b></div>}
          </div>
        )}
        {!busy && !res && !err && <div className="thinking idle">waiting for a frame…</div>}
      </div>
    </section>
  );
}
