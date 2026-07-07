// Client for the deployed Butterbase functions + auth. The function endpoints
// insights (public) and perceive (auth required) carry no secrets; auth uses
// the app's public signup/login routes.
export const APP_ID = "app_c8rxilh0nxr6";
export const API = `https://api.butterbase.ai/v1/${APP_ID}`;
export const AUTH = `https://api.butterbase.ai/auth/${APP_ID}`;

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
export type User = { id: string; email: string; display_name?: string | null };
export type CheckIn = {
  id: string; label: string; confidence: number | null;
  reason: string | null; created_at: string; image_object_id: string | null;
};

// --- auth state (localStorage) ---------------------------------------------
const TOKEN_KEY = "gt_token";
const USER_KEY = "gt_user";

export function currentUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
function token(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
function setSession(access_token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function signup(email: string, password: string, display_name?: string) {
  const r = await fetch(`${AUTH}/signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || `signup ${r.status}`);
  // signup doesn't return tokens — log in immediately.
  return login(email, password);
}

export async function login(email: string, password: string): Promise<User> {
  const r = await fetch(`${AUTH}/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || `login ${r.status}`);
  const d = await r.json();
  setSession(d.access_token, d.user);
  return d.user;
}

export async function logout() {
  const t = token();
  if (t) await fetch(`${AUTH}/logout`, { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// --- data / functions ------------------------------------------------------
export type GraphNode = { id: string; type: string; label: string; priority: number | null };
export type GraphLink = { source: string; target: string; type: string };

// Public: the life-graph structure for the visualization panel.
export async function getGraph(): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const r = await fetch(`${API}/fn/graph`);
  if (!r.ok) return { nodes: [], links: [] };
  return r.json();
}

export async function getInsights(now: string = DEMO_NOW): Promise<Insights> {
  const r = await fetch(`${API}/fn/insights?now=${encodeURIComponent(now)}`);
  if (!r.ok) throw new Error(`insights ${r.status}`);
  return r.json();
}

// The planned-vs-actual day view: intentions (with reconciliation verdict)
// aligned on a time axis against the activity spans actually recorded.
export type DayIntention = {
  title: string; planStart: string; planEnd: string; project: string;
  status: "fulfilled" | "present-no-output" | "skipped";
};
export type DayActivity = { label: string; start: string; end: string; confidence: number | null };
export type DayData = {
  date: string; dates: string[];
  intentions: DayIntention[]; activities: DayActivity[];
};
export const DEMO_DAY = "2026-07-03";

export async function getDay(date: string = DEMO_DAY): Promise<DayData> {
  const r = await fetch(`${API}/fn/day?date=${encodeURIComponent(date)}`);
  if (!r.ok) throw new Error(`day ${r.status}`);
  return r.json();
}

export async function perceive(input: {
  image_base64?: string; image_url?: string; now?: string;
}): Promise<PerceiveResult> {
  const t = token();
  if (!t) throw new Error("Log in to run the live camera.");
  const r = await fetch(`${API}/fn/perceive`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
    body: JSON.stringify({ now: LIVE_NOW, ...input }),
  });
  if (r.status === 401) throw new Error("Session expired — log in again.");
  if (!r.ok) throw new Error(`perceive ${r.status}`);
  return r.json();
}

// RLS-scoped read: returns only the signed-in user's check-ins.
export async function getMyCheckins(): Promise<CheckIn[]> {
  const t = token();
  if (!t) return [];
  const r = await fetch(`${API}/camera_events?order=created_at.desc&limit=8`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!r.ok) return [];
  return r.json();
}

// Mint a fresh presigned download URL for a stored frame (expires ~1h).
export async function getDownloadUrl(objectId: string): Promise<string | null> {
  const t = token();
  if (!t || !objectId) return null;
  const r = await fetch(`https://api.butterbase.ai/storage/${APP_ID}/download/${objectId}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  return d?.downloadUrl ?? null;
}

// --- Reckoning (RocketRide coaching narrative) + payment -------------------
export const PRO_PLAN_ID = "6a196a8b-b88f-4b84-a7cd-9779d03b781f";
export type Reckoning = { id: string; narrative: string; model: string | null; week_of: string | null; created_at: string };

// Public read of the latest reckoning (global — the shared demo week).
export async function getReckoning(): Promise<Reckoning | null> {
  const r = await fetch(`${API}/reckonings?order=created_at.desc&limit=1`);
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] ?? null;
}

// Pro status: our subscriptions table (RLS-scoped) OR a real Stripe sub.
export async function isPro(): Promise<boolean> {
  const t = token();
  if (!t) return false;
  try {
    const r = await fetch(`${API}/subscriptions?status=eq.active&limit=1`, { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) { const rows = await r.json(); if (Array.isArray(rows) && rows.length) return true; }
  } catch { /* ignore */ }
  try {
    const r = await fetch(`${API}/billing/subscription`, { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) { const sub = await r.json().catch(() => null); if (sub && (sub.status === "active" || sub.status === "trialing")) return true; }
  } catch { /* ignore */ }
  return false;
}

// Checkout: try real Stripe first; if the seller hasn't finished Stripe
// onboarding, fall back to recording the subscription in Butterbase
// (purchase state in app tables — per Butterbase's own guidance).
export async function startProCheckout(): Promise<{ redirect?: string; activated?: boolean }> {
  const t = token();
  if (!t) throw new Error("Log in first.");
  try {
    const r = await fetch(`${API}/billing/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ planId: PRO_PLAN_ID, successUrl: `${location.origin}/?upgraded=1`, cancelUrl: location.origin }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.url) return { redirect: d.url };
  } catch { /* fall through */ }
  const ins = await fetch(`${API}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
    body: JSON.stringify({ plan_id: PRO_PLAN_ID, plan_name: "Groundtruth Pro", status: "active", source: "demo" }),
  });
  if (!ins.ok) throw new Error("Couldn’t activate Pro.");
  return { activated: true };
}
