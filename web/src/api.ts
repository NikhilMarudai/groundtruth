// Client for the deployed Butterbase functions. No secrets: these endpoints
// are public (auth:none). The app_id is public information.
export const APP_ID = "app_0wk6a2jkez7f";
export const API = `https://api.butterbase.ai/v1/${APP_ID}`;

// The demo's reference "now": Friday evening, so the week reads fully and the
// thesis stall shows "4 days".
export const DEMO_NOW = "2026-07-03T18:00:00";
// A moment inside the Friday 09:00–12:00 thesis block, for the live camera demo.
export const LIVE_NOW = "2026-07-03T10:00:00";

export type Reconciliation = {
  date: string; title: string; project: string;
  presence: number; outputs: number;
  status: "fulfilled" | "present-no-output" | "skipped";
};
export type Insights = {
  now: string;
  reconciliation: Reconciliation[];
  misalignment: { goal: string; priority: number; outputs: number }[];
  stall: { goal: string; lastAdvanced: string; daysSince: number }[];
  timeByLabel: { label: string; hours: number }[];
};
export type PerceiveResult = {
  label: string; confidence: number | null; reason: string;
  now: string; intended: string | null; project: string | null;
  todayCount: number; nudge: string; severity: "ok" | "warn" | "info";
};

export async function getInsights(now: string = DEMO_NOW): Promise<Insights> {
  const r = await fetch(`${API}/fn/insights?now=${encodeURIComponent(now)}`);
  if (!r.ok) throw new Error(`insights ${r.status}`);
  return r.json();
}

export async function perceive(input: {
  image_base64?: string; image_url?: string; now?: string;
}): Promise<PerceiveResult> {
  const r = await fetch(`${API}/fn/perceive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ now: LIVE_NOW, ...input }),
  });
  if (!r.ok) throw new Error(`perceive ${r.status}`);
  return r.json();
}
