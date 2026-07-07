import { useEffect, useRef, useState } from "react";
import { getGraph, type GraphNode, type GraphLink } from "./api";

const COLOR: Record<string, string> = {
  Goal: "#a371f7", Project: "#6ea8fe", Intention: "#d29922", Artifact: "#3fb950",
};
const RADIUS: Record<string, number> = { Goal: 15, Project: 11, Intention: 5, Artifact: 5 };
const W = 820, H = 460;

type P = { x: number; y: number; vx: number; vy: number };

// Lightweight force-directed layout (repulsion + link springs + centering),
// settled over a few hundred rAF frames. 30 nodes — cheap and organic.
export default function GraphView() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [pos, setPos] = useState<P[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const posRef = useRef<P[]>([]);
  const idxRef = useRef<Record<string, number>>({});
  const rafRef = useRef<number>(0);

  useEffect(() => { getGraph().then((g) => { setNodes(g.nodes); setLinks(g.links); }); }, []);

  useEffect(() => {
    if (!nodes.length) return;
    const idx: Record<string, number> = {};
    nodes.forEach((n, i) => (idx[n.id] = i));
    idxRef.current = idx;

    const p: P[] = nodes.map((_, i) => ({
      x: W / 2 + Math.cos(i * 1.7) * 130 + (i % 7) * 6,
      y: H / 2 + Math.sin(i * 1.7) * 110 + (i % 5) * 6,
      vx: 0, vy: 0,
    }));
    posRef.current = p;
    setPos(p.map((q) => ({ ...q })));

    const linkIdx = links
      .map((l) => [idx[l.source], idx[l.target]])
      .filter(([a, b]) => a != null && b != null) as [number, number][];

    let frame = 0;
    const step = () => {
      const P = posRef.current;
      const n = P.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
          const d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2);
          const f = 1500 / d2, fx = (f * dx) / d, fy = (f * dy) / d;
          P[i].vx += fx; P[i].vy += fy; P[j].vx -= fx; P[j].vy -= fy;
        }
      }
      for (const [a, b] of linkIdx) {
        let dx = P[b].x - P[a].x, dy = P[b].y - P[a].y;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01, f = (d - 92) * 0.02;
        const fx = (f * dx) / d, fy = (f * dy) / d;
        P[a].vx += fx; P[a].vy += fy; P[b].vx -= fx; P[b].vy -= fy;
      }
      for (let i = 0; i < n; i++) {
        P[i].vx += (W / 2 - P[i].x) * 0.0022; P[i].vy += (H / 2 - P[i].y) * 0.0022;
        P[i].vx *= 0.86; P[i].vy *= 0.86;
        P[i].x = Math.max(24, Math.min(W - 24, P[i].x + P[i].vx));
        P[i].y = Math.max(24, Math.min(H - 24, P[i].y + P[i].vy));
      }
      setPos(P.map((q) => ({ ...q })));
      if (++frame < 320) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [nodes, links]);

  const idx = idxRef.current;
  return (
    <section className="card graphcard">
      <h2>Your life as a graph</h2>
      <p className="hint">Goals ← Projects ← Artifacts, and Intentions → Projects. This is the connected structure the agent traverses in Neo4j — not flat rows.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="graphsvg">
        {links.map((l, i) => {
          const a = pos[idx[l.source]], b = pos[idx[l.target]];
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="glink" />;
        })}
        {nodes.map((n, i) => {
          const p = pos[i];
          if (!p) return null;
          const r = RADIUS[n.type] || 5;
          const showLabel = n.type === "Goal" || n.type === "Project" || hover === i;
          return (
            <g key={n.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
              <circle cx={p.x} cy={p.y} r={r} fill={COLOR[n.type]} stroke="#0d1117" strokeWidth={1.5} opacity={0.95} />
              {showLabel && (
                <text x={p.x} y={p.y - r - 4} textAnchor="middle" className="glabel">{n.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="glegend">
        {Object.entries(COLOR).map(([t, c]) => (
          <span key={t}><i style={{ background: c }} />{t}</span>
        ))}
      </div>
    </section>
  );
}
