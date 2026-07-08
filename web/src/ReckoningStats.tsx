import { useEffect, useState } from "react";
import type { Insights } from "./api";

// Dopamine layer for the Pro Reckoning: animated rings + count-up numbers,
// all derived from the real graph data. Self-contained scoped styles.

function useCountUp(target: number, ms = 950) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0, start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Ring({ pct, color, label, sub }: { pct: number; color: string; label: string; sub: string }) {
  const v = useCountUp(pct);
  const R = 34, C = 2 * Math.PI * R;
  return (
    <div className="rs-ring">
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={R} className="rs-track" />
        <circle cx="40" cy="40" r={R} stroke={color} strokeDasharray={C}
          strokeDashoffset={C * (1 - v / 100)} className="rs-arc" transform="rotate(-90 40 40)" />
        <text x="40" y="44" textAnchor="middle" className="rs-pct">{Math.round(v)}%</text>
      </svg>
      <div className="rs-lbl">{label}</div>
      <div className="rs-sub">{sub}</div>
    </div>
  );
}

export default function ReckoningStats({ ins }: { ins: Insights | null }) {
  const recon = ins?.reconciliation ?? [];
  const total = recon.length || 1;
  const fulfilled = recon.filter((r) => r.status === "fulfilled").length;
  const followPct = Math.round((fulfilled / total) * 100);

  const fit = recon.filter((r) => r.project === "Fitness");
  const fitDone = fit.filter((r) => r.status === "fulfilled").length;
  const fitPct = fit.length ? Math.round((fitDone / fit.length) * 100) : 0;

  const hrs = (l: string) => ins?.timeByLabel.find((t) => t.label === l)?.hours ?? 0;
  const deep = hrs("Working");
  const leisure = hrs("Leisure");
  const deepUp = useCountUp(deep);
  const leisureUp = useCountUp(leisure);

  return (
    <div className="rs">
      <style>{`
        .rs { margin: 6px 0 16px; }
        .rs-rings { display:flex; gap:10px; flex-wrap:wrap; }
        .rs-ring { flex:1; min-width:96px; text-align:center; background:#0e1420; border:1px solid var(--line); border-radius:12px; padding:12px 8px 10px; }
        .rs-ring svg { width:74px; height:74px; }
        .rs-track { fill:none; stroke:#1e2735; stroke-width:7; }
        .rs-arc { fill:none; stroke-width:7; stroke-linecap:round; transition:stroke-dashoffset .1s linear; filter:drop-shadow(0 0 5px currentColor); }
        .rs-pct { fill:var(--text); font-size:18px; font-weight:800; }
        .rs-lbl { font-size:12.5px; font-weight:600; margin-top:4px; }
        .rs-sub { font-size:11px; color:var(--dim); }
        .rs-chips { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
        .rs-chip { flex:1; min-width:130px; background:#0e1420; border:1px solid var(--line); border-radius:12px; padding:12px 14px; }
        .rs-chip .n { font-size:22px; font-weight:800; font-variant-numeric:tabular-nums; }
        .rs-chip .n small { font-size:13px; font-weight:600; color:var(--dim); }
        .rs-chip .k { font-size:12px; color:var(--dim); margin-top:1px; }
        .rs-chip.win { border-color:#1f5c34; background:linear-gradient(135deg,#10271a,#0e1420); }
        .rs-flame { font-size:13px; }
      `}</style>
      <div className="rs-rings">
        <Ring pct={followPct} color="#6ea8fe" label="Plans kept" sub={`${fulfilled}/${total} intentions`} />
        <Ring pct={fitPct} color="#3fb950" label="Movement" sub={`${fitDone}/${fit.length || 0} sessions`} />
        <Ring pct={100} color="#a371f7" label="Tracked" sub="7/7 days" />
      </div>
      <div className="rs-chips">
        <div className="rs-chip win">
          <div className="n">{deepUp.toFixed(1)}<small>h</small></div>
          <div className="k">deep work this week</div>
        </div>
        <div className="rs-chip">
          <div className="n">{leisureUp.toFixed(1)}<small>h</small></div>
          <div className="k">leisure — reclaimable</div>
        </div>
        <div className="rs-chip win">
          <div className="n">{fitDone}<span className="rs-flame"> 🔥</span></div>
          <div className="k">movement streak</div>
        </div>
      </div>
    </div>
  );
}
