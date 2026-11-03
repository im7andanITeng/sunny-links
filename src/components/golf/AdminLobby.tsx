import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadPlayer } from "@/game/player";
import { loadProgress } from "@/game/progress";
import { HOLES_PER_LEVEL } from "@/game/course";
import { loadCoins } from "@/game/coins";

type Msg = { id: string; user_id: string; author: string; body: string; created_at: string };
type Status = { user_id: string; name: string; levels_passed: number; hole: number; coins: number; updated_at: string };

/** Secret admin-only lobby: chat, share scores, see each other's progress. Access is enforced by the database. */
export default function AdminLobby({ onBack }: { onBack: () => void }) {
  const [me, setMe] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [people, setPeople] = useState<Status[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const myStats = () => {
    const p = loadPlayer();
    const prog = loadProgress();
    const levels = Math.max(p.levels_passed, Math.floor(prog.holeIdx / HOLES_PER_LEVEL));
    return { name: `${p.name}${p.tag ? ` (${p.tag})` : ""}`, levels_passed: levels, hole: prog.holeIdx + 1, coins: Number(loadCoins()) || 0 };
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !alive) return;
      setMe(u.user.id);
      await supabase.from("admin_status").upsert({ user_id: u.user.id, ...myStats(), updated_at: new Date().toISOString() });
      const [{ data: m }, { data: s }] = await Promise.all([
        supabase.from("admin_messages").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("admin_status").select("*").order("levels_passed", { ascending: false }),
      ]);
      if (!alive) return;
      setMsgs((m ?? []).reverse());
      setPeople(s ?? []);
    };
    void load();
    const ch = supabase
      .channel(`admin-lobby-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_messages" }, (p) => {
        const m = p.new as Msg;
        setMsgs((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_status" }, (p) => {
        const s = p.new as Status;
        if (!s?.user_id) return;
        setPeople((ps) => [...ps.filter((x) => x.user_id !== s.user_id), s].sort((a, b) => b.levels_passed - a.levels_passed));
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length]);

  const post = async (body: string) => {
    if (!me || !body.trim()) return;
    setErr(null);
    const { data, error } = await supabase.from("admin_messages")
      .insert({ user_id: me, author: myStats().name, body: body.trim().slice(0, 500) }).select().single();
    if (error) { setErr("Couldn't send — are you online and signed in as admin?"); return; }
    setMsgs((ms) => (ms.some((x) => x.id === data.id) ? ms : [...ms, data]));
  };
  const send = () => { const t = text; setText(""); void post(t); };
  const shareScore = () => {
    const s = myStats();
    void post(`🏆 I'm on Level ${s.levels_passed + 1}, hole ${s.hole} with ${s.coins} coins!`);
  };

  return (
    <div className="menu-card menu-wide">
      <h2 className="menu-h2">🕶 Secret Admin Lobby</h2>
      <p className="menu-sub">Only admins can see this room.</p>

      <section className="admin-sec">
        <h3 className="admin-sec-title">📊 Admin progress</h3>
        {people.length === 0 ? <p className="menu-sub">No admins here yet.</p> : (
          <table className="board-table">
            <thead><tr><th>Admin</th><th>Level</th><th>Hole</th><th>Coins</th></tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.user_id}><td>{p.name}{p.user_id === me ? " (you)" : ""}</td><td>{p.levels_passed + 1}</td><td>{p.hole}</td><td>{p.coins}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-sec">
        <h3 className="admin-sec-title">💬 Chat</h3>
        <div className="lobby-chat">
          {msgs.length === 0 && <p className="menu-sub">Say hi to the other admins!</p>}
          {msgs.map((m) => (
            <div key={m.id} className={`lobby-msg${m.user_id === me ? " lobby-mine" : ""}`}>
              <b>{m.author}</b> <span>{m.body}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="cheat-row">
          <input className="cheat-input" value={text} maxLength={500} placeholder="Message the admins…" aria-label="Lobby message"
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
          <button className="menu-btn menu-btn-play" onClick={send} disabled={!text.trim()}>Send</button>
        </div>
        <button className="menu-btn menu-btn-small" onClick={shareScore}>🏆 Share my score</button>
        {err && <p className="menu-sub" role="alert">{err}</p>}
      </section>

      <button className="menu-btn" onClick={onBack}>⬅ Back to Admin Panel</button>
    </div>
  );
}
