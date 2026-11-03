import { useEffect, useRef, useState } from "react";
import GolfGame from "./GolfGame";
import AdminLobby from "./AdminLobby";
import devBadge from "@/assets/dev-badge.jpg.asset.json";
import adminBadge from "@/assets/admin-badge.jpg.asset.json";
import guardBadge from "@/assets/guard-badge.avif.asset.json";
import ownerBadge from "@/assets/owner-badge.png.asset.json";
const OWNER_EMAIL = "fahadalthani537@gmail.com";
import menuBg from "@/assets/menu-bg.jpg";
import { fetchLeaderboard, loadPlayer, savePlayer, setOfflineMode, type Player } from "@/game/player";
import { SKINS, ADMIN_SKIN, ADMIN_SKINS, loadSkinId, saveSkinId, skinPreview } from "@/game/skins";
import { dailyHole, daysInMonth, dayKey, limitedId, limitedSkin, loadDone, loadPrizes, markDone, MONTHS, todayKey } from "@/game/daily";
import { COIN_PACKS, addCoins, buySkin, loadBought, loadCoins, skinPrice } from "@/game/coins";
import { ALL_SKINS_KEY, useAdmin } from "@/game/admin";
import { fetchAllPlayers, isBanned, setBanned, type AdminRow } from "@/game/player";
import { freshProgress, loadProgress, saveProgress } from "@/game/progress";
import { HOLES_PER_LEVEL, getHole } from "@/game/course";
import { supabase } from "@/integrations/supabase/client";
import { isVip, setVip, ownsByLevel, unlockAtFor, packPrice, VIP_PRICE } from "@/game/vip";
import { claimGifts, sendGift, skinNumberToId, type GiftKind } from "@/game/gifts";
import { isInappropriate, LOCAL_BAN_KEY, STRIKE_KEY } from "@/game/badwords";
import { useServerFn } from "@tanstack/react-start";
import { cheatAssistant } from "@/game/cheat-assistant.functions";
import { clearCheats, hasCheats, setCheats, useCheats, type Cheats } from "@/game/cheats";

type Screen = "pickplay" | "vip" | "menu" | "play" | "board" | "profile" | "skins" | "daily" | "dailyplay" | "admin" | "coins";

const SEEN_KEY = "sunny-links-skins-seen";

function GiftUnlock({ levels }: { levels: number }) {
  const [queue, setQueue] = useState<number[]>([]);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const got = SKINS.filter((s) => ownsByLevel(s, levels, isVip())).length;
    const raw = localStorage.getItem(SEEN_KEY);
    const seen = raw === null ? got : Number(raw) || 1;
    if (raw === null) localStorage.setItem(SEEN_KEY, String(got));
    if (got > seen) setQueue(Array.from({ length: got - seen }, (_, i) => seen + i));
  }, [levels]);
  const id = queue[0];
  if (id === undefined) return null;
  const skin = SKINS[id]!;
  const next = () => {
    localStorage.setItem(SEEN_KEY, String(id + 1));
    setOpened(false); setQueue((q) => q.slice(1));
  };
  return (
    <div className="gift-wrap" role="dialog" aria-label="New skin unlocked">
      <p className="gift-title">{opened ? "New ball skin!" : "You got a present!"}</p>
      <button className={`gift-box${opened ? " is-open" : ""}`} onClick={() => setOpened(true)} aria-label="Open present">
        <img className="gift-ball" alt={skin.name} src={skinPreview(skin)} />
        <span className="gift-lid" /><span className="gift-body" />
      </button>
      {opened ? <>
        <p className="gift-name">{skin.name}</p>
        <button className="menu-btn menu-btn-play" onClick={() => { saveSkinId(skin.id); next(); }}>Use it!</button>
        <button className="menu-btn" onClick={next}>Later</button>
      </> : <p className="gift-hint">Tap the present to open it</p>}
    </div>
  );
}

function Skins({ levels, admin, onBack }: { levels: number; admin: boolean; onBack: () => void }) {
  const [sel, setSel] = useState(0);
  const [coins, setCoins] = useState(0);
  const [bought, setBought] = useState<number[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { setSel(loadSkinId()); setCoins(loadCoins()); setBought(loadBought()); }, []);
  const allFree = admin && typeof window !== "undefined" && localStorage.getItem(ALL_SKINS_KEY) === "1";
  const owns = (id: number) => allFree || ownsByLevel(SKINS[id]!, levels, isVip()) || bought.includes(id);
  const got = SKINS.filter((s) => owns(s.id)).length;
  const [limited, setLimited] = useState<ReturnType<typeof limitedSkin>[]>([]);
  useEffect(() => setLimited(loadPrizes().map(limitedSkin)), []);
  const tap = (id: number) => {
    const s = SKINS[id]!;
    if (owns(id)) { setSel(id); saveSkinId(id); setMsg(null); return; }
    const price = skinPrice(s);
    if (price === null) { setMsg(`The GOD BALL can't be bought — pass ${unlockAtFor(s, isVip())} levels!`); return; }
    if (coins < price) { setMsg(`${s.name} costs 🪙 ${price}. You need ${price - coins} more coins.`); return; }
    if (buySkin(s)) { setCoins(loadCoins()); setBought(loadBought()); setSel(id); saveSkinId(id); setMsg(`You bought ${s.name}! 🎉`); }
  };
  return (
    <div className="menu-card menu-wide">
      <h2 className="menu-h2">Ball Skins</h2>
      <p className="menu-sub">🪙 {coins} coins · {got} / {SKINS.length} owned · free skin every 5 levels, or buy with coins</p>
      {msg && <p className="menu-sub" role="status"><b>{msg}</b></p>}
      {limited.length > 0 && <>
        <p className="menu-sub"><b>⭐ Limited monthly skins</b></p>
        <div className="skin-grid">
          {limited.map((s) => (
            <button key={s.id} className={`skin-cell${sel === s.id ? " is-sel" : ""}`} aria-label={s.name} onClick={() => { setSel(s.id); saveSkinId(s.id); setMsg(null); }}>
              <img className="skin-ball" alt="" src={skinPreview(s)} style={{ boxShadow: "0 0 14px gold" }} />
              <span className="skin-name">{s.name}</span>
            </button>
          ))}
        </div>
      </>}
      {admin && <>
        <p className="menu-sub"><b>🛠 Admin only</b></p>
        <div className="skin-grid">
          {ADMIN_SKINS.map((s) => (
            <button key={s.id} className={`skin-cell${sel === s.id ? " is-sel" : ""}`} aria-label={s.name} onClick={() => { setSel(s.id); saveSkinId(s.id); setMsg(null); }}>
              <img className={`skin-ball${s.pattern === "glitch" ? " is-glitch" : ""}`} alt="" src={skinPreview(s)} style={{ boxShadow: "0 0 14px crimson" }} />
              <span className="skin-name">{s.name}</span>
            </button>
          ))}
        </div>
      </>}
      <div className="skin-grid">
        {SKINS.map((s) => {
          const open = owns(s.id);
          const price = skinPrice(s);
          const label = open ? s.name : price === null ? `🔒 Lv ${unlockAtFor(s, isVip())}` : `Lv ${unlockAtFor(s, isVip())} or 🪙${price}`;
          return (
            <button key={s.id} className={`skin-cell${sel === s.id ? " is-sel" : ""}`} style={open ? undefined : { opacity: 0.75 }}
              title={label} aria-label={open ? s.name : `${s.name}: ${label}`}
              onClick={() => tap(s.id)}>
              <img className="skin-ball" alt="" src={skinPreview(s)} style={s.pattern === "god" ? { boxShadow: "0 0 14px gold" } : open ? undefined : { filter: "grayscale(0.7)" }} />
              <span className="skin-name">{label}</span>
            </button>
          );
        })}
      </div>
      <button className="menu-btn" onClick={onBack}>← Back</button>
    </div>
  );
}

const AVATAR_KEY = "sunny-links-avatar";

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 160;
      const c = document.createElement("canvas");
      c.width = size; c.height = size;
      const ctx = c.getContext("2d")!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function Avatar({ src, name, className }: { src: string | null; name: string; className: string }) {
  return src
    ? <img src={src} alt={`${name} profile picture`} className={className} />
    : <span className={className}>{(name.trim()[0] || "G").toUpperCase()}</span>;
}

export default function GolfApp() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [player, setPlayer] = useState<Player | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const { admin: serverAdmin, email } = useAdmin();
  const admin = serverAdmin;
  const [adminPopup, setAdminPopup] = useState(false);
  useEffect(() => {
    if (!serverAdmin || !email) return;
    const k = `sunny-links-admin-welcomed-${email}`;
    if (!localStorage.getItem(k)) { localStorage.setItem(k, "1"); setAdminPopup(true); }
  }, [serverAdmin, email]);
  // Flag this device's player row as a dev as soon as an admin signs in.
  const stamped = useRef("");
  useEffect(() => {
    if (!serverAdmin || !player || stamped.current === player.id) return;
    stamped.current = player.id;
    void savePlayer(player);
  }, [serverAdmin, player]);
  const [banned, setBannedState] = useState(false);

  useEffect(() => {
    const saved = loadPlayer();
    const p = { ...saved, levels_passed: Math.max(saved.levels_passed, Math.floor(loadProgress().holeIdx / HOLES_PER_LEVEL)) };
    setPlayer(p); void savePlayer(p);
    void isBanned(p.id).then((b) => setBannedState(b || localStorage.getItem(LOCAL_BAN_KEY) === "1"));
    setAvatar(localStorage.getItem(AVATAR_KEY));
    void claimGifts(p.id).then((gs) => {
      if (!gs.length) return;
      const lv = gs.reduce<number | undefined>((a, g) => g.levels ?? a, undefined);
      if (lv !== undefined) onLevelComplete(lv);
      setGiftMsg(gs.map((g) => g.msg).join(", "));
    });
  }, []);
  const [giftMsg, setGiftMsg] = useState<string | null>(null);

  const changeAvatar = (a: string | null) => {
    setAvatar(a);
    try { if (a) localStorage.setItem(AVATAR_KEY, a); else localStorage.removeItem(AVATAR_KEY); } catch { /* full */ }
  };

  const onLevelComplete = (n: number) => {
    setPlayer((p) => {
      if (!p || n <= p.levels_passed) return p;
      const np = { ...p, levels_passed: n };
      void savePlayer(np);
      return np;
    });
  };

  const [creepy, setCreepy] = useState(false);
  const saveProfile = (p: Player) => {
    if (admin || (!isInappropriate(p.name) && !isInappropriate(p.tag))) { setPlayer(p); void savePlayer(p); setScreen("menu"); return; }
    const clean = { ...p, name: isInappropriate(p.name) ? "Golfer" : p.name, tag: isInappropriate(p.tag) ? "" : p.tag };
    const strikes = Number(localStorage.getItem(STRIKE_KEY) || 0) + 1;
    localStorage.setItem(STRIKE_KEY, String(strikes));
    if (strikes >= 2) {
      localStorage.setItem(LOCAL_BAN_KEY, "1");
      setPlayer(clean); void savePlayer(clean); setBannedState(true); setScreen("menu");
      return;
    }
    const np = { ...clean, levels_passed: Math.max(0, clean.levels_passed - 1) };
    const pr = loadProgress();
    { const back = Math.max(0, (Math.floor(pr.holeIdx / HOLES_PER_LEVEL) - 1) * HOLES_PER_LEVEL); saveProgress(freshProgress(back, pr.scores.slice(0, back))); }
    setPlayer(np); void savePlayer(np); setScreen("menu"); setCreepy(true);
    setTimeout(() => setCreepy(false), 4000);
  };
  if (creepy) return <div className="creepy-wrap" role="alert"><p className="creepy-text">DONT USE INNAPROPREATE WORDS!!!<br />-1 LEVEL</p></div>;
  if (banned && !admin && localStorage.getItem(LOCAL_BAN_KEY) === "1") return <div className="creepy-wrap" role="alert"><p className="creepy-text">YOU ARE BANNED<br />FROM SUNNY LINKS</p></div>;
  const gift = player && <GiftUnlock levels={player.levels_passed} />;
  if (screen === "dailyplay") {
    const key = todayKey();
    return <GolfGame key={key} daily={{ hole: dailyHole(key), onDone: () => { markDone(key); } }} onMenu={() => setScreen("daily")} />;
  }
  if (screen === "play") return <>{gift}<GolfGame onLevelComplete={onLevelComplete} onMenu={() => setScreen("menu")} /></>;

  return (
    <div className="menu-root" style={{ backgroundImage: `url(${menuBg})` }}>
      {gift}
      {giftMsg && (
        <div className="gift-wrap" role="dialog" aria-label="Gift from admin">
          <p className="gift-title" style={{ marginBottom: 12 }}>🎁 An admin gave you: {giftMsg}!</p>
          <button className="menu-btn menu-btn-play" onClick={() => setGiftMsg(null)}>Yay!</button>
        </div>
      )}
      {adminPopup && (
        <div className="gift-wrap" role="dialog" aria-label="Admin unlocked">
          <p className="gift-title" style={{ marginBottom: 12 }}>🛠 You got the Admin Panel!</p>
          <button className="menu-btn menu-btn-play" onClick={() => { setAdminPopup(false); setScreen("admin"); }}>Open it</button>
          <button className="menu-btn" onClick={() => setAdminPopup(false)}>OK</button>
        </div>
      )}
      {screen === "menu" && (
        <>
          <button className="menu-pp" aria-label="Profile" onClick={() => setScreen("profile")}>
            <Avatar src={avatar} name={player?.name ?? "G"} className="menu-pp-img" />
          </button>
          {typeof window !== "undefined" && isVip() && <span className="menu-pp-crown" aria-hidden>👑</span>}
          {serverAdmin && <img src={devBadge.url} alt="DEV badge" className="dev-badge dev-badge-pp" />}
          {serverAdmin && <img src={adminBadge.url} alt="ADMIN badge" className="dev-badge admin-badge admin-badge-pp" />}
          {serverAdmin && <img src={guardBadge.url} alt="GUARD badge" className="dev-badge guard-badge-pp" />}
          {serverAdmin && email?.toLowerCase() === OWNER_EMAIL && <img src={ownerBadge.url} alt="OWNER badge" className="dev-badge owner-badge-pp" />}
          <button className="menu-vip" aria-label="VIP" onClick={() => setScreen("vip")}>👑<span>VIP</span></button>
          {banned && <p className="menu-banned">🚫 You are banned from Sunny Links</p>}
          <div className="menu-titlebox">
            <h1 className="menu-title">Sunny Links</h1>
            <p className="menu-desc">Simple Mini Golf</p>
          </div>
          <div className="menu-bar">
            <button className="menu-bar-btn" onClick={() => setScreen("board")}>🏆 Online Leaderboard</button>
            <span className="menu-bar-line" aria-hidden />
            <button className="menu-bar-btn" onClick={() => setScreen("daily")}>📅 Daily Levels</button>
            <span className="menu-bar-line" aria-hidden />
            <button className="menu-bar-btn menu-bar-play" onClick={() => { if (!banned || admin) setScreen("pickplay"); }} disabled={banned && !admin}>▶ Play</button>
            <span className="menu-bar-line" aria-hidden />
            <button className="menu-bar-btn" onClick={() => setScreen("skins")}>⚪ Ball Skins</button>
            <span className="menu-bar-line" aria-hidden />
            <button className="menu-bar-btn" onClick={() => setScreen("coins")}>🪙 Coins</button>
          </div>
        </>
      )}
      {screen === "daily" && <DailyCalendar onPlay={() => setScreen("dailyplay")} onBack={() => setScreen("menu")} />}
      {screen === "pickplay" && (
        <div className="menu-card">
          <h2 className="menu-h2">▶ How do you want to play?</h2>
          <button className="menu-btn menu-btn-play" onClick={() => { setOfflineMode(false); if (player) void savePlayer(loadPlayer()); setScreen("play"); }}>🌐 Play Online</button>
          <p className="menu-sub">Your levels go on the Online Leaderboard.</p>
          <button className="menu-btn menu-btn-play" onClick={() => { setOfflineMode(true); setScreen("play"); }}>✈️ Play Offline</button>
          <p className="menu-sub">No internet needed. Your levels save on this device and go to the leaderboard next time you play online.</p>
          <button className="menu-btn" onClick={() => setScreen("menu")}>← Back</button>
        </div>
      )}
      {screen === "vip" && <VipScreen onBack={() => setScreen("menu")} />}
      {screen === "coins" && <CoinShop onBack={() => setScreen("menu")} />}
      {screen === "board" && <Leaderboard me={player?.id} onBack={() => setScreen("menu")} />}
      {screen === "skins" && <Skins levels={player?.levels_passed ?? 0} admin={admin} onBack={() => setScreen("menu")} />}
      {screen === "profile" && player && (
        <Profile player={player} avatar={avatar} onAvatar={changeAvatar} email={email} admin={admin}
          onSave={saveProfile} onBack={() => setScreen("menu")} onAdmin={() => setScreen("admin")} />
      )}
      {screen === "admin" && admin && player && (
        <AdminPanel me={player.id} serverAdmin={serverAdmin} email={email} onLeave={() => {}} onLevels={onLevelComplete} onBack={() => setScreen("menu")} />
      )}
    </div>
  );
}

const CHEAT_NAMES: Record<keyof Cheats, string> = {
  speedMult: "🏎 Ball speed",
  ballScale: "🎾 Ball size",
  cupScale: "🕳 Hole size",
  allMud: "🟫 All mud",
  allIce: "🧊 All ice",
  spooky: "🎃 Spooky",
  ghost: "👻 Through walls",
  aim: "📏 Aim line",
  coinRain: "🪙 Coin rain",
};

function CheatAssistant() {
  const cheats = useCheats();
  const run = useServerFn(cheatAssistant);
  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const on = (Object.keys(cheats) as (keyof Cheats)[]).filter((k) =>
    typeof cheats[k] === "boolean" ? (cheats[k] as boolean) : (cheats[k] as number) !== 1,
  );
  const send = async () => {
    const c = cmd.trim();
    if (!c || busy) return;
    setBusy(true);
    setReply(null);
    try {
      const r = await run({ data: { command: c, current: cheats } });
      setCheats(r.cheats);
      setReply(r.reply);
      setCmd("");
    } catch (e) {
      setReply(e instanceof Error ? e.message : "The assistant could not answer.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="admin-sec">
      <h3 className="admin-sec-title">🤖 Cheat Assistant</h3>
      <p className="menu-sub">Tell it what to spoof — "make my ball 2x faster", "the floor is all mud", "spooky background".</p>
      <div className="cheat-row">
        <input
          className="cheat-input"
          value={cmd}
          placeholder="Type a cheat command…"
          aria-label="Cheat command"
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          disabled={busy}
        />
        <button className="menu-btn menu-btn-play" onClick={send} disabled={busy || !cmd.trim()}>
          {busy ? "🪄…" : "🪄 Do it"}
        </button>
      </div>
      {reply && <p className="menu-sub" role="status"><b>🤖 {reply}</b></p>}
      {on.length > 0 ? (
        <div className="cheat-tags">
          {on.map((k) => (
            <span key={k} className="cheat-tag">
              {CHEAT_NAMES[k]}
              {typeof cheats[k] === "number" ? ` ×${cheats[k]}` : ""}
            </span>
          ))}
        </div>
      ) : (
        <p className="menu-sub">No cheats on right now.</p>
      )}
      <button
        className="menu-btn menu-btn-small"
        onClick={() => { clearCheats(); setReply("All cheats cleared."); }}
      >
        🧹 Clear all cheats
      </button>
    </section>
  );
}

function AdminPanel({ me, onLevels, onBack, serverAdmin, email, onLeave }: { me: string; onLevels: (n: number) => void; onBack: () => void; serverAdmin: boolean; email: string | null; onLeave: () => void }) {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [allSkins, setAllSkins] = useState(false);
  const [vipOn, setVipOn] = useState(false);
  const [lobby, setLobby] = useState(false);
  useEffect(() => { setVipOn(isVip()); setAllSkins(localStorage.getItem(ALL_SKINS_KEY) === "1"); if (serverAdmin) fetchAllPlayers().then(setRows); }, [serverAdmin]);
  const skip = (levels: number) => {
    const p = loadProgress();
    const cur = Math.floor(p.holeIdx / HOLES_PER_LEVEL);
    const next = (cur + levels) * HOLES_PER_LEVEL;
    const scores = [...p.scores.slice(0, next)];
    while (scores.length < next) scores.push(getHole(scores.length).par);
    saveProgress(freshProgress(next, scores));
    onLevels(cur + levels);
    setMsg(`Skipped to Level ${cur + levels + 1}!`);
  };
  const toggleBan = async (r: AdminRow) => {
    if (await setBanned(r.id, !r.banned)) setRows((rs) => rs?.map((x) => x.id === r.id ? { ...x, banned: !r.banned } : x) ?? null);
  };
  if (lobby && serverAdmin) return <AdminLobby onBack={() => setLobby(false)} />;
  return (
    <div className="menu-card menu-wide">
      <h2 className="menu-h2">🛠 Admin Panel</h2>
      {msg && <p className="menu-sub" role="status"><b>{msg}</b></p>}
      {serverAdmin && <button className="menu-btn menu-btn-play" onClick={() => setLobby(true)}>🕶 Secret Admin Lobby</button>}

      <section className="admin-sec">
        <h3 className="admin-sec-title">👑 VIP</h3>
        <button className={`menu-btn menu-btn-play${vipOn ? " admin-on" : ""}`} onClick={() => { const v = !vipOn; setVip(v); setVipOn(v); setMsg(v ? "👑 You got VIP!" : "VIP removed"); }}>
          {vipOn ? "❌ Remove VIP" : "👑 Get VIP — free"}
        </button>
        <p className="menu-sub">{vipOn ? "VIP is on: skin every 3 levels, $1 off coin packs, double coins." : "Turns on every VIP perk without paying."}</p>
      </section>

      <CheatAssistant />

      <section className="admin-sec">
        <h3 className="admin-sec-title">⏭ Levels</h3>
        <div className="admin-row">
          <button className="menu-btn" onClick={() => skip(1)}>⏭ Skip 1 level</button>
          <button className="menu-btn" onClick={() => skip(10)}>⏩ Skip 10 levels</button>
        </div>
      </section>

      <section className="admin-sec">
        <h3 className="admin-sec-title">🪙 Coins & Skins</h3>
        <div className="admin-row">
          <button className="menu-btn" onClick={() => { setMsg(`🪙 ${addCoins(1000)} coins`); }}>🪙 +1000 coins</button>
          <button className="menu-btn" onClick={() => { const v = !allSkins; localStorage.setItem(ALL_SKINS_KEY, v ? "1" : "0"); setAllSkins(v); setMsg(v ? "Every skin unlocked (even GOD BALL)!" : "Skins back to normal"); }}>
            {allSkins ? "🔒 Turn off all skins" : "🎁 Unlock every skin"}
          </button>
        </div>
      </section>

      {serverAdmin && rows && <GiftSender rows={rows} />}

      <section className="admin-sec">
        <h3 className="admin-sec-title">👥 Players</h3>
        {!serverAdmin ? (<><p className="menu-sub">Sign in with the admin account to ban players.</p><AdminLogin email={email} /></>) : !rows ? <p>Loading…</p> : (
          <table className="golf-table">
            <thead><tr><th>Player</th><th>Levels</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.id === me ? "menu-me" : ""} style={r.banned ? { opacity: 0.6 } : undefined}>
                  <td>{r.name}{r.tag && <span className="menu-tag">{r.tag}</span>}</td>
                  <td>{r.levels_passed}</td>
                  <td>{r.is_admin ? <span className="menu-tag">🛡 DEV</span> : r.id !== me && <button className={`menu-btn menu-btn-small${r.banned ? "" : " admin-ban"}`} onClick={() => toggleBan(r)}>{r.banned ? "Unban" : "Ban"}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-sec">
        <h3 className="admin-sec-title">🔑 Account</h3>
        <div className="admin-row">
          <button className="menu-btn" onClick={async () => { await supabase.auth.signOut(); onLeave(); onBack(); }}>Leave admin</button>
          <button className="menu-btn" onClick={onBack}>← Back</button>
        </div>
      </section>
    </div>
  );
}

function AdminLogin({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  if (email) return <p className="menu-sub">Signed in as {email}</p>;
  if (!open) return <button className="menu-btn menu-btn-small" onClick={() => setOpen(true)}>Sign in</button>;
  const go = async (signup: boolean) => {
    setMsg(null);
    const r = signup
      ? await supabase.auth.signUp({ email: mail, password: pass, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email: mail, password: pass });
    if (r.error) setMsg(r.error.message);
    else if (signup && !r.data.session) setMsg("Check your email and tap the link, then sign in.");
  };
  return (
    <div className="admin-login">
      <label className="menu-field">Email<input type="email" value={mail} onChange={(e) => setMail(e.target.value)} /></label>
      <label className="menu-field">Password<input type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
      {msg && <p className="menu-sub" role="status">{msg}</p>}
      <div className="admin-row">
        <button className="menu-btn menu-btn-small" onClick={() => go(false)}>Sign in</button>
        <button className="menu-btn menu-btn-small" onClick={() => go(true)}>Make account</button>
      </div>
    </div>
  );
}

function Leaderboard({ me, onBack }: { me: string | undefined; onBack: () => void }) {
  const [rows, setRows] = useState<Player[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const load = () => fetchLeaderboard().then((r) => { if (r) { setRows(r); setFailed(false); } else setFailed(true); }).catch(() => setFailed(true));
    void load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="menu-card menu-wide">
      <h2 className="menu-h2">Leaderboard</h2>
      <p className="menu-sub">Levels passed</p>
      {failed && <p className="menu-sub">Can't reach the leaderboard. Check your internet.</p>}
      {!rows ? (!failed && <p>Loading…</p>) : rows.length === 0 ? <p>No one has passed a level yet. Be the first!</p> : (
        <table className="golf-table">
          <thead><tr><th>#</th><th>Player</th><th>Levels</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={r.id === me ? "menu-me" : ""}>
                <td>{i + 1}</td>
                <td>{r.is_owner && <img src={ownerBadge.url} alt="OWNER" title="OWNER of the game" className="dev-badge admin-badge-name" />}{r.is_admin && <><img src={devBadge.url} alt="DEV" title="DEV" className="dev-badge dev-badge-name" /><img src={adminBadge.url} alt="ADMIN" title="ADMIN" className="dev-badge admin-badge admin-badge-name" /><img src={guardBadge.url} alt="GUARD" title="GUARD — protected account" className="dev-badge admin-badge-name" /></>}{r.name}{r.tag && <span className="menu-tag">{r.tag}</span>}</td>
                <td>{r.levels_passed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="menu-btn" onClick={onBack}>← Back</button>
    </div>
  );
}

function Profile({ player, avatar, onAvatar, onSave, onBack, email, admin, onAdmin }: {
  player: Player; avatar: string | null; onAvatar: (a: string | null) => void; email: string | null;
  onSave: (p: Player) => void; onBack: () => void; admin: boolean; onAdmin: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [tag, setTag] = useState(player.tag);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="menu-card">
      <h2 className="menu-h2">Profile</h2>
      <Avatar src={avatar} name={name} className="menu-pp-big" />
      {admin && <p className="menu-sub"><img src={devBadge.url} alt="" className="dev-badge" /> <b>DEV</b> — you're a game developer</p>}
      {admin && <p className="menu-sub"><img src={adminBadge.url} alt="" className="dev-badge admin-badge" /> <b>ADMIN</b> — you have the Admin Panel</p>}
      {admin && email?.toLowerCase() === OWNER_EMAIL && <p className="menu-sub"><img src={ownerBadge.url} alt="" className="dev-badge" /> <b>OWNER</b> — you own Sunny Links</p>}
      {admin && <p className="menu-sub"><img src={guardBadge.url} alt="" className="dev-badge" /> <b>GUARD</b> — your account is protected: no one can ban you</p>}
      <input ref={fileRef} type="file" accept="image/*" hidden aria-label="Profile picture file"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) onAvatar(await resizeImage(f)); e.target.value = ""; }} />
      <button className="menu-btn" onClick={() => fileRef.current?.click()}>📷 Choose profile picture</button>
      {avatar && <button className="menu-btn menu-btn-small" onClick={() => onAvatar(null)}>Remove picture</button>}
      <label className="menu-field">Name
        <input aria-label="Name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="menu-field">Name tag
        <input aria-label="Name tag" maxLength={24} value={tag} placeholder="Anything you like" onChange={(e) => setTag(e.target.value)} />
      </label>
      <p className="menu-sub">Levels passed: {player.levels_passed}</p>
      {admin && <button className="menu-btn admin-panel-btn" onClick={onAdmin}>🛠 Admin Panel</button>}
      <AdminLogin email={email} />
      {email && <button className="menu-btn menu-btn-small" onClick={() => supabase.auth.signOut()}>Sign out</button>}
      <button className="menu-btn menu-btn-play" onClick={() => onSave({ ...player, name: name.trim() || "Golfer", tag: tag.trim() })}>Save</button>
      <button className="menu-btn" onClick={onBack}>← Back</button>
    </div>
  );
}


function DailyCalendar({ onPlay, onBack }: { onPlay: () => void; onBack: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [prizes, setPrizes] = useState<number[]>([]);
  useEffect(() => { setNow(new Date()); setDone(loadDone()); setPrizes(loadPrizes()); }, []);
  if (!now) return null;
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const n = daysInMonth(y, m), first = new Date(y, m, 1).getDay();
  const prize = limitedSkin(limitedId(y, m));
  const won = prizes.includes(prize.id);
  const missed = Array.from({ length: today - 1 }, (_, i) => dayKey(y, m, i + 1)).some((k) => !done.includes(k));
  const doneToday = done.includes(todayKey(now));
  return (
    <div className="menu-card menu-wide">
      <h2 className="menu-h2">📅 Daily Challenge</h2>
      <p className="menu-sub">One extra-hard hole every day. Play every day of {MONTHS[m]} to win the limited ball!</p>
      <div className="cal-head"><b>{MONTHS[m]} {y}</b></div>
      <div className="cal-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="cal-wd">{d}</span>)}
        {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = i + 1, isDone = done.includes(dayKey(y, m, d));
          const cls = isDone ? "is-done" : d < today ? "is-missed" : d === today ? "is-today" : "";
          return <span key={d} className={`cal-day ${cls}`} aria-label={`${MONTHS[m]} ${d}${isDone ? " completed" : d < today ? " missed" : ""}`}>{isDone ? "✓" : d}</span>;
        })}
      </div>
      <div className="cal-prize">
        <img className="skin-ball" alt="" src={skinPreview(prize)} style={{ boxShadow: "0 0 14px gold", filter: won ? undefined : missed ? "grayscale(1)" : undefined }} />
        <div>
          <b>{prize.name}</b>
          <p className="menu-sub">{won ? "You won it! Find it in Ball Skins ⭐" : missed ? "You missed a day — try again next month!" : `${done.filter((k) => k.startsWith(dayKey(y, m, 1).slice(0, 7))).length} / ${n} days done`}</p>
        </div>
      </div>
      {doneToday
        ? <p className="menu-sub"><b>Today's hole is done ✅ Come back tomorrow!</b></p>
        : <button className="menu-btn menu-btn-play" onClick={onPlay}>▶ Play today's hole</button>}
      <button className="menu-btn" onClick={onBack}>← Back</button>
    </div>
  );
}

function CoinShop({ onBack }: { onBack: () => void }) {
  const [coins, setCoins] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [vip, setV] = useState(false);
  useEffect(() => { setCoins(loadCoins()); setV(isVip()); }, []);
  return (
    <div className="menu-card menu-wide">
      <h2 className="menu-h2">🪙 Coins</h2>
      {vip && <p className="menu-sub">👑 VIP price: $1 off every pack!</p>}
      <p className="menu-sub">You have 🪙 {coins} coins</p>
      {msg && <p className="menu-sub" role="status"><b>{msg}</b></p>}
      <div className="coin-grid">
        {COIN_PACKS.map((p) => (
          <button key={p.coins} className="coin-pack" onClick={() => setMsg("Buying coins is coming soon!")}>
            <span className="coin-pack-amt">🪙 {p.coins.toLocaleString()}</span>
            <span className="coin-pack-price">{vip && packPrice(p.usd, true) !== p.usd && <s>${p.usd.toFixed(2)}</s>} ${packPrice(p.usd, vip).toFixed(2)}</span>
          </button>
        ))}
      </div>
      <button className="menu-btn" onClick={onBack}>← Back</button>
    </div>
  );
}

function VipScreen({ onBack }: { onBack: () => void }) {
  const [vip, setV] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setV(isVip()), []);
  return (
    <div className="menu-card vip-card">
      <h2 className="menu-h2">👑 VIP</h2>
      {vip ? <p className="menu-sub"><b>You are VIP! Enjoy your perks.</b></p> : <p className="menu-sub">One payment, forever.</p>}
      <ul className="vip-list">
        <li>🎁 A new ball skin every <b>3 levels</b> (instead of 5)</li>
        <li>🪙 <b>$1 off</b> every coin pack</li>
        <li>✨ <b>Double coins</b> from every coin you roll over</li>
        <li>👑 A gold crown on your profile picture</li>
      </ul>
      {msg && <p className="menu-sub" role="status"><b>{msg}</b></p>}
      {!vip && <button className="menu-btn menu-btn-play" onClick={() => setMsg("Buying VIP is coming soon!")}>Get VIP · ${VIP_PRICE.toFixed(2)}</button>}
      <button className="menu-btn" onClick={onBack}>← Back</button>
    </div>
  );
}

const GIFT_OPTIONS: { kind: GiftKind; label: string; needs?: string }[] = [
  { kind: "coins", label: "🪙 Coins", needs: "How many coins?" },
  { kind: "vip", label: "👑 VIP" },
  { kind: "daily", label: "📅 Finish all Daily Levels (this month)" },
  { kind: "levels", label: "⏭ Skip levels", needs: "How many levels?" },
  { kind: "skin", label: "🎾 A ball skin", needs: "Skin number (1 to 500)" },
  { kind: "all_skins", label: "🎁 Every ball skin" },
];

function GiftSender({ rows }: { rows: AdminRow[] }) {
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<GiftKind>("coins");
  const [num, setNum] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const opt = GIFT_OPTIONS.find((o) => o.kind === kind)!;
  const send = async () => {
    if (!to) return setMsg("Pick a player first.");
    let amount = 0;
    if (opt.needs) {
      amount = Math.floor(Number(num));
      if (!Number.isFinite(amount) || amount < 1 || amount > 100000000) return setMsg("Type a number bigger than 0.");
      if (kind === "skin" && skinNumberToId(amount) === null) return setMsg("Skin number must be 1 to 500.");
    }
    const name = rows.find((r) => r.id === to)?.name ?? "player";
    setMsg((await sendGift(to, kind, amount)) ? `🎁 Sent to ${name}! They get it next time they open the game.` : "Couldn't send. Check the internet.");
  };
  return (
    <section className="admin-sec">
      <h3 className="admin-sec-title">🎁 Gift a player</h3>
      <div className="gift-form">
        <select className="menu-input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Player">
          <option value="">Choose a player…</option>
          {rows.map((r) => <option key={r.id} value={r.id}>{r.name}{r.tag ? ` (${r.tag})` : ""} · Lv {r.levels_passed}</option>)}
        </select>
        <select className="menu-input" value={kind} onChange={(e) => { setKind(e.target.value as GiftKind); setNum(""); }} aria-label="Gift">
          {GIFT_OPTIONS.map((o) => <option key={o.kind} value={o.kind}>{o.label}</option>)}
        </select>
        {opt.needs && <input className="menu-input" type="number" min={1} max={kind === "skin" ? 500 : undefined} placeholder={opt.needs} value={num} onChange={(e) => setNum(e.target.value)} aria-label={opt.needs} />}
        <button className="menu-btn menu-btn-play" onClick={send}>🎁 Send gift</button>
      </div>
      {msg && <p className="menu-sub" role="status">{msg}</p>}
    </section>
  );
}
