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
  reason: string | null; created_at: string;
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
export async function getInsights(now: string = DEMO_NOW): Promise<Insights> {
  const r = await fetch(`${API}/fn/insights?now=${encodeURIComponent(now)}`);
  if (!r.ok) throw new Error(`insights ${r.status}`);
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
