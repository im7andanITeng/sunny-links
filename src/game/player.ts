import { supabase } from "@/integrations/supabase/client";

export type Player = { id: string; name: string; tag: string; levels_passed: number; is_admin?: boolean; is_owner?: boolean };

const KEY = "sunny-links-player";

export function loadPlayer(): Player {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Player;
  } catch { /* ignore */ }
  const p: Player = { id: crypto.randomUUID(), name: "Golfer", tag: "", levels_passed: 0 };
  localStorage.setItem(KEY, JSON.stringify(p));
  return p;
}

/** Offline mode: play with no internet; scores stay on this device and sync next time you play online. */
let offline = false;
export const setOfflineMode = (v: boolean) => { offline = v; };
export const isOfflineMode = () => offline;

export async function savePlayer(p: Player) {
  localStorage.setItem(KEY, JSON.stringify(p));
  if (offline || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
  try { await supabase.from("players").upsert({
    id: p.id, name: p.name.trim() || "Golfer", tag: p.tag.trim(), levels_passed: p.levels_passed,
    updated_at: new Date().toISOString(),
  }); } catch { /* no internet — synced next time */ }
}

export async function fetchLeaderboard(): Promise<Player[] | null> {
  const { data, error } = await supabase
    .from("players").select("id,name,tag,levels_passed,is_admin,is_owner").eq("banned", false).gt("levels_passed", 0)
    .order("levels_passed", { ascending: false }).order("updated_at", { ascending: true }).limit(50);
  if (error) return null;
  return data ?? [];
}

export async function isBanned(id: string): Promise<boolean> {
  const { data } = await supabase.from("players").select("banned").eq("id", id).maybeSingle();
  return !!data?.banned;
}

export type AdminRow = Player & { banned: boolean; is_admin: boolean };
export async function fetchAllPlayers(): Promise<AdminRow[]> {
  const { data } = await supabase.from("players").select("id,name,tag,levels_passed,banned,is_admin")
    .order("levels_passed", { ascending: false }).limit(200);
  return data ?? [];
}
export async function setBanned(id: string, banned: boolean) {
  const { error } = await supabase.from("players").update({ banned }).eq("id", id);
  return !error;
}
