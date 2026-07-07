import { useEffect, useState } from "react";
import { getDay, type DayData, type DayIntention, type DayActivity } from "./api";

// The product thesis made legible on a real time axis: what you PLANNED
// (intentions, coloured by reconciliation verdict) beside what you ACTUALLY
// did (activity spans, coloured by category), aligned by clock time so the
// gap between intention and reality is obvious.

const DAY_START = 6;   // 06:00
const DAY_END = 24;    // 24:00
const SPAN_MIN = (DAY_END - DAY_START) * 60;
const PX_PER_MIN = 1.15;              // lane height ≈ 18h * 60 * 1.15 ≈ 1242px
const LANE_H = SPAN_MIN * PX_PER_MIN;

const STATUS_COLOR: Record<string, string> = {
  fulfilled: "#3fb950",
  "present-no-output": "#d29922",
  skipped: "#f85149",
};
const STATUS_LABEL: Record<string, string> = {
  fulfilled: "done",
  "present-no-output": "present, no output",
  skipped: "skipped",
};

// Activity category → colour (dark-theme palette).
const CAT_COLOR: Record<string, string> = {
  Sleeping: "#6e7681",
  Working: "#6ea8fe",
  Exercising: "#3fb950",
  Eating: "#d29922",
  "Personal care": "#a371f7",
  Chores: "#8b7355",
  Leisure: "#f778ba",
  Walking: "#56d4dd",
  Away: "#39414d",
};
const catColor = (label: string) => CAT_COLOR[label] || "#39414d";

// Minutes from 06:00, read straight off the ISO string's clock time so we
// never apply a browser timezone offset (data is authored in wall-clock).
function minsFromStart(iso: string): number {
  const h = Number(iso.slice(11, 13));
  const m = Number(iso.slice(14, 16));
  return (h - DAY_START) * 60 + m;
}
const clock = (iso: string) => iso.slice(11, 16);

function fmtDate(d: string): string {
  const dt = new Date(d + "T12:00:00Z");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

type Block = { topPct: number; heightPct: number; startMin: number };
function geom(startIso: string, endIso: string): Block {
  const s = Math.max(0, minsFromStart(startIso));
  const e = Math.min(SPAN_MIN, minsFromStart(endIso));
  const top = (s / SPAN_MIN) * 100;
  const height = Math.max(1.4, ((e - s) / SPAN_MIN) * 100);
  return { topPct: top, heightPct: height, startMin: s };
}

export default function DayView() {
  const [data, setData] = useState<DayData | null>(null);
  const [date, setDate] = useState<string>("2026-07-03");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getDay(date).then((d) => { if (live) { setData(d); setErr(null); } }).catch((e) => live && setErr(String(e)));
    return () => { live = false; };
  }, [date]);

  const dates = data?.dates ?? [date];
  const hours: number[] = [];
  for (let h = DAY_START; h <= DAY_END; h += 2) hours.push(h);

  return (
    <section className="card dayview">
      <div className="dv-head">
        <div>
          <h2>Planned vs. actual — one day</h2>
          <p className="hint">What you intended, aligned by clock time against what the graph actually recorded. The gap is the point.</p>
        </div>
      </div>

      <div className="dv-dates">
        {dates.map((d) => (
          <button
            key={d}
            className={`dv-datebtn${d === date ? " on" : ""}`}
            onClick={() => setDate(d)}
          >{fmtDate(d)}</button>
        ))}
      </div>

      {err && <div className="err">Couldn’t load day: {err}</div>}

      <div className="dv-lanes">
        {/* Time axis */}
        <div className="dv-axis" style={{ height: LANE_H }}>
          {hours.map((h) => (
            <div key={h} className="dv-tick" style={{ top: `${((h - DAY_START) * 60 / SPAN_MIN) * 100}%` }}>
              <span>{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>

        {/* Planned lane */}
        <div className="dv-lane">
          <div className="dv-lane-h">Planned</div>
          <div className="dv-track" style={{ height: LANE_H }}>
            {hours.map((h) => (
              <div key={h} className="dv-grid" style={{ top: `${((h - DAY_START) * 60 / SPAN_MIN) * 100}%` }} />
            ))}
            {(data?.intentions ?? []).map((i, k) => <PlannedBlock key={k} i={i} />)}
            {data && data.intentions.length === 0 && <div className="dv-empty">no plan set</div>}
          </div>
        </div>

        {/* Actual lane */}
        <div className="dv-lane">
          <div className="dv-lane-h">Actual</div>
          <div className="dv-track" style={{ height: LANE_H }}>
            {hours.map((h) => (
              <div key={h} className="dv-grid" style={{ top: `${((h - DAY_START) * 60 / SPAN_MIN) * 100}%` }} />
            ))}
            {(data?.activities ?? []).map((a, k) => <ActualBlock key={k} a={a} />)}
          </div>
        </div>
      </div>

      <div className="dv-legend">
        <div className="dv-leg-group">
          <span className="dv-leg-t">verdict</span>
          {Object.entries(STATUS_LABEL).map(([s, l]) => (
            <span key={s} className="dv-leg"><i style={{ background: STATUS_COLOR[s] }} />{l}</span>
          ))}
        </div>
        <div className="dv-leg-group">
          <span className="dv-leg-t">activity</span>
          {["Working", "Exercising", "Eating", "Leisure", "Sleeping", "Personal care", "Walking"].map((c) => (
            <span key={c} className="dv-leg"><i style={{ background: catColor(c) }} />{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlannedBlock({ i }: { i: DayIntention }) {
  const g = geom(i.planStart, i.planEnd);
  const color = STATUS_COLOR[i.status] || "#8b949e";
  return (
    <div
      className="dv-block dv-plan"
      style={{
        top: `${g.topPct}%`, height: `${g.heightPct}%`,
        borderColor: color, boxShadow: `inset 3px 0 0 ${color}`,
        background: `linear-gradient(90deg, ${color}22, #1c223088)`,
      }}
      title={`${i.title} — ${STATUS_LABEL[i.status]}`}
    >
      <div className="dv-block-body">
        <div className="dv-block-title">{i.title}</div>
        <div className="dv-block-meta">
          {clock(i.planStart)}–{clock(i.planEnd)} · {i.project}
        </div>
        <div className="dv-block-verdict" style={{ color }}>{STATUS_LABEL[i.status]}</div>
      </div>
    </div>
  );
}

function ActualBlock({ a }: { a: DayActivity }) {
  const g = geom(a.start, a.end);
  const color = catColor(a.label);
  const tall = g.heightPct > 5;
  return (
    <div
      className="dv-block dv-act"
      style={{
        top: `${g.topPct}%`, height: `${g.heightPct}%`,
        borderColor: color, boxShadow: `inset 3px 0 0 ${color}`,
        background: `linear-gradient(90deg, ${color}26, #1c223088)`,
      }}
      title={`${a.label} · ${clock(a.start)}–${clock(a.end)}${a.confidence != null ? ` · ${(a.confidence * 100).toFixed(0)}%` : ""}`}
    >
      <div className="dv-block-body">
        <div className="dv-block-title">{a.label}</div>
        {tall && <div className="dv-block-meta">{clock(a.start)}–{clock(a.end)}</div>}
      </div>
    </div>
  );
}
