import { LIMITED_BASE, limitedSkin, MONTHS } from "./daily";

export type Pattern =
  | "classic" | "rainbow" | "smiley" | "stars" | "dots" | "checker"
  | "stripes" | "hearts" | "bolt" | "eyes" | "flames" | "planet" | "zigzag" | "target" | "god" | "limited" | "autograph" | "glitch";

/** Admin-only signed ball. */
export const ADMIN_SKIN_ID = 9000;
export const ADMIN_SKIN: Skin = { id: ADMIN_SKIN_ID, name: "Signed Ball", pattern: "autograph", a: "#ffffff", b: "#d8d8d8", emissive: "#000000", metalness: 0, roughness: 0.4, unlockAt: Infinity };

/** Admin-only glitch ball. */
export const GLITCH_SKIN_ID = 9001;
export const GLITCH_SKIN: Skin = { id: GLITCH_SKIN_ID, name: "Glitch Ball", pattern: "glitch", a: "#0a0a12", b: "#00ffd5", emissive: "#2a003a", metalness: 0.2, roughness: 0.3, unlockAt: Infinity };
export const ADMIN_SKINS: Skin[] = [ADMIN_SKIN, GLITCH_SKIN];

/** Any skin by id, including monthly limited ones. */
export function getSkin(id: number): Skin {
  if (id === ADMIN_SKIN_ID) return ADMIN_SKIN;
  if (id === GLITCH_SKIN_ID) return GLITCH_SKIN;
  if (id >= LIMITED_BASE) return limitedSkin(id);
  return SKINS[id] ?? SKINS[0]!;
}

export type Skin = {
  id: number; name: string; pattern: Pattern; a: string; b: string;
  emissive: string; metalness: number; roughness: number; unlockAt: number;
};

export const LEVELS_PER_SKIN = 5;
export const TOTAL = 500;

const PALETTES: [string, string, string][] = [
  ["Sunny", "#ffd23f", "#ff6b35"],
  ["Ocean", "#1e90ff", "#ffffff"],
  ["Forest", "#2e8b57", "#c6f68d"],
  ["Candy", "#ff69b4", "#fff0f6"],
  ["Night", "#1b1b3a", "#f5f5ff"],
  ["Lava", "#d7263d", "#ffb703"],
  ["Ice", "#a8e6ff", "#2a6f97"],
  ["Grape", "#7b2cbf", "#e0aaff"],
  ["Mint", "#3ddc97", "#073b4c"],
  ...(() => {
    const names = ["Coral", "Lemon", "Jungle", "Berry", "Storm", "Peach", "Arctic", "Royal", "Lime", "Cocoa", "Rose", "Sky", "Ember", "Moss", "Plum", "Sand", "Neon", "Cherry", "Teal", "Honey", "Shadow", "Bubble", "Cactus", "Dragon", "Pearl", "Sunset", "Lagoon", "Tiger", "Cloud", "Ruby", "Jade", "Amber", "Cobalt"];
    return names.map((n, i): [string, string, string] => {
      const h = (i * 47 + 10) % 360, h2 = (h + 120 + (i % 4) * 40) % 360;
      return [n, `hsl(${h}, ${70 + (i % 3) * 10}%, ${40 + (i % 4) * 8}%)`, `hsl(${h2}, 90%, ${i % 2 ? 90 : 20}%)`];
    });
  })(),
];
const PATTERNS: [Pattern, string][] = [
  ["smiley", "Smiley"], ["stars", "Stars"], ["dots", "Polka"],
  ["checker", "Checker"], ["stripes", "Stripes"], ["hearts", "Hearts"], ["bolt", "Lightning"],
  ["eyes", "Googly"], ["flames", "Flames"], ["planet", "Planet"], ["zigzag", "Zigzag"], ["target", "Target"],
];

/** 500 skins: #0 classic white, #1 rainbow, then pattern × palette combos, last is the God Ball. One unlocks every 5 levels. */
export const SKINS: Skin[] = (() => {
  const list: Skin[] = [{ id: 0, name: "Classic White", pattern: "classic", a: "#ffffff", b: "#dddddd", emissive: "#000000", metalness: 0, roughness: 0.35, unlockAt: 0 }];
  list.push({ id: 1, name: "Rainbow", pattern: "rainbow", a: "#ffffff", b: "#ffffff", emissive: "#000000", metalness: 0.05, roughness: 0.35, unlockAt: LEVELS_PER_SKIN });
  outer: for (const [pal, a, b] of PALETTES) for (const [pat, pn] of PATTERNS) {
    if (list.length >= TOTAL - 1) break outer;
    const id = list.length;
    list.push({ id, name: `${pal} ${pn}`, pattern: pat, a, b, emissive: pat === "flames" || pat === "bolt" ? "#331100" : "#000000", metalness: pal === "Night" ? 0.3 : 0.05, roughness: 0.35, unlockAt: id * LEVELS_PER_SKIN });
  }
  list.push({ id: TOTAL - 1, name: "GOD BALL", pattern: "god", a: "#ffd700", b: "#fff8dc", emissive: "#a07800", metalness: 0.9, roughness: 0.15, unlockAt: (TOTAL - 1) * LEVELS_PER_SKIN });
  return list;
})();

export const isUnlocked = (s: Skin, levelsPassed: number) => levelsPassed >= s.unlockAt;

const KEY = "sunny-links-skin";
export function loadSkinId(): number {
  try { const n = Number(localStorage.getItem(KEY)); return Number.isInteger(n) && n >= 0 && (n < TOTAL || n >= LIMITED_BASE || n === ADMIN_SKIN_ID || n === GLITCH_SKIN_ID) ? n : 0; } catch { return 0; }
}
export function saveSkinId(id: number) { try { localStorage.setItem(KEY, String(id)); } catch { /* ignore */ } }

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const t = (i * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
  ctx.closePath(); ctx.fill();
}
function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); ctx.fill();
}

/** Draws a skin into a square canvas (used for the ball texture and the menu preview). */
export function drawSkin(ctx: CanvasRenderingContext2D, s: Skin, W: number) {
  const H = W, u = W / 16;
  ctx.fillStyle = s.a; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = s.b; ctx.strokeStyle = s.b;
  switch (s.pattern) {
    case "limited": {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, s.a); g.addColorStop(0.5, "#ffffff"); g.addColorStop(1, s.a);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = s.b;
      for (let i = 0; i < 4; i++) star(ctx, (i + 0.5) * (W / 4), H * 0.2, u * 1.1);
      ctx.font = `900 ${u * 4}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = u * 0.5; ctx.strokeStyle = "#5a3c00";
      const t = (MONTHS[(s.id - LIMITED_BASE) % 12] ?? "").slice(0, 3).toUpperCase();
      ctx.strokeText(t, W / 2, H * 0.6); ctx.fillText(t, W / 2, H * 0.6);
      break;
    }
    case "glitch": {
      const cols = ["#00ffd5", "#ff2bd6", "#f5f5ff", "#2b6bff", "#39ff14"];
      let r = 7;
      const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = cols[i % cols.length]!; ctx.globalAlpha = 0.5 + rnd() * 0.5;
        ctx.fillRect(rnd() * W, rnd() * H, u * (1 + rnd() * 6), u * (0.2 + rnd() * 0.8));
      }
      ctx.globalAlpha = 1;
      ctx.font = `900 ${u * 3.4}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#ff2bd6"; ctx.fillText("ERR0R", W / 2 - u * 0.3, H / 2);
      ctx.fillStyle = "#00ffd5"; ctx.fillText("ERR0R", W / 2 + u * 0.3, H / 2);
      ctx.fillStyle = "#ffffff"; ctx.fillText("ERR0R", W / 2, H / 2);
      break;
    }
    case "autograph": {
      for (let y = u; y < H; y += u * 1.6) for (let x = (y / u) % 2 ? u : u * 1.8; x < W; x += u * 1.6) { ctx.beginPath(); ctx.arc(x, y, u * 0.3, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#14286e"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `italic 400 ${u * 3.4}px "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive`;
      ctx.save(); ctx.translate(W / 2, H * 0.36); ctx.rotate(-0.12); ctx.fillText("Fahad", 0, 0); ctx.restore();
      ctx.font = `italic 400 ${u * 1.6}px "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive`; ctx.fillText("&", W / 2, H * 0.52);
      ctx.font = `italic 400 ${u * 3.4}px "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive`;
      ctx.save(); ctx.translate(W / 2, H * 0.7); ctx.rotate(-0.12); ctx.fillText("Yassin", 0, 0);
      ctx.lineWidth = u * 0.25; ctx.strokeStyle = "#14286e"; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-u * 4, u * 1.6); ctx.quadraticCurveTo(0, u * 2.6, u * 4.5, u * 1.2); ctx.stroke(); ctx.restore();
      break;
    }
    case "classic":
      for (let y = u; y < H; y += u * 1.6) for (let x = (y / u) % 2 ? u : u * 1.8; x < W; x += u * 1.6) { ctx.beginPath(); ctx.arc(x, y, u * 0.35, 0, 7); ctx.fill(); }
      break;
    case "rainbow": {
      const cols = ["#e63946", "#f77f00", "#fcbf49", "#2a9d8f", "#277da1", "#6a4c93"];
      cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, (i * H) / 6, W, H / 6 + 1); });
            break;
    }
    case "smiley": {
      ctx.fillStyle = s.b; ctx.beginPath(); ctx.arc(W * 0.38, H * 0.4, u * 1.1, 0, 7); ctx.arc(W * 0.62, H * 0.4, u * 1.1, 0, 7); ctx.fill();
      ctx.lineWidth = u * 0.9; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(W / 2, H * 0.5, u * 3.4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      break;
    }
    case "stars": for (let i = 0; i < 14; i++) star(ctx, ((i * 37) % 16) * u + u / 2, ((i * 53) % 16) * u + u / 2, u * 1.1); break;
    case "dots": for (let y = u; y < H; y += u * 4) for (let x = (y / u) % 8 < 4 ? u : u * 3; x < W; x += u * 4) { ctx.beginPath(); ctx.arc(x, y, u * 1.1, 0, 7); ctx.fill(); } break;
    case "checker": for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) ctx.fillRect(x * u * 2, y * u * 2, u * 2, u * 2); break;
    case "stripes": for (let x = -H; x < W; x += u * 3) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + u * 1.5, 0); ctx.lineTo(x + u * 1.5 + H, H); ctx.lineTo(x + H, H); ctx.fill(); } break;
    case "hearts": for (let i = 0; i < 12; i++) heart(ctx, ((i * 41) % 16) * u + u, ((i * 29) % 16) * u + u, u * 1.1); break;
    case "bolt":
      for (const ox of [0, W / 2]) { ctx.beginPath(); ctx.moveTo(ox + u * 4.5, u); ctx.lineTo(ox + u * 2, u * 8.5); ctx.lineTo(ox + u * 4, u * 8.5); ctx.lineTo(ox + u * 2.8, u * 15); ctx.lineTo(ox + u * 6.5, u * 6.5); ctx.lineTo(ox + u * 4.3, u * 6.5); ctx.lineTo(ox + u * 6, u); ctx.fill(); }
      break;
    case "eyes":
      for (const x of [0.36, 0.64]) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(W * x, H / 2, u * 2, 0, 7); ctx.fill(); ctx.fillStyle = "#111111"; ctx.beginPath(); ctx.arc(W * x + u * 0.5, H / 2 + u * 0.4, u * 0.9, 0, 7); ctx.fill(); }
      break;
    case "flames":
      for (let i = 0; i < 6; i++) { const x = i * u * 3; ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + u * 0.2, H * 0.5, x + u * 1.5, H * 0.2 + (i % 2) * u * 2); ctx.quadraticCurveTo(x + u * 2.2, H * 0.6, x + u * 3, H); ctx.fill(); }
      break;
    case "planet":
      ctx.globalAlpha = 0.6; for (let y = u; y < H; y += u * 2.5) ctx.fillRect(0, y, W, u * (0.6 + ((y / u) % 3) * 0.3)); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(W * 0.7, H * 0.65, u * 1.4, 0, 7); ctx.fill();
      break;
    case "zigzag":
      ctx.lineWidth = u * 0.9; for (let y = u * 2; y < H; y += u * 4) { ctx.beginPath(); for (let x = 0; x <= W; x += u * 2) ctx.lineTo(x, y + ((x / u / 2) % 2 ? u : -u)); ctx.stroke(); }
      break;
    case "target":
      for (let r = 7; r > 0; r--) { ctx.fillStyle = r % 2 ? s.b : s.a; ctx.beginPath(); ctx.arc(W / 2, H / 2, r * u, 0, 7); ctx.fill(); }
      break;
    case "god": {
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, "#fffbe6"); g.addColorStop(0.5, "#ffd700"); g.addColorStop(1, "#b8860b");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff8dc"; ctx.globalAlpha = 0.7;
      for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.lineTo(W / 2 + Math.cos(t) * W, H / 2 + Math.sin(t) * W); ctx.lineTo(W / 2 + Math.cos(t + 0.12) * W, H / 2 + Math.sin(t + 0.12) * W); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; star(ctx, W / 2, H / 2, u * 3);
      ctx.fillStyle = "#8b0000"; ctx.font = `900 ${u * 1.6}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("GOD", W / 2, H * 0.85);
      break;
    }
  }
}

const previews = new Map<number, string>();
export function skinPreview(s: Skin): string {
  let url = previews.get(s.id);
  if (!url) {
    const c = document.createElement("canvas"); c.width = c.height = 96;
    drawSkin(c.getContext("2d")!, s, 96); url = c.toDataURL(); previews.set(s.id, url);
  }
  return url;
}
