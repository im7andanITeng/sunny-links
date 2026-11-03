// Ball physics for mini golf. Plain TS — no React or three.js.
import type { Hole, Rect } from "./course";

export const BALL_R = 0.12;
export const CUP_R = 0.2;
export const MAX_SPEED = 11;
export const RESTITUTION = 0.72;
export const GRASS = { k: 0.55, c: 0.75 };
export const SAND = { k: 4.5, c: 3 };
export const SINK_SPEED = 2.4;
export const REST_SPEED = 0.06;
export const PAD_SPEED = 7;
export const MUD = { k: 7, c: 5 };
export const ICE = { k: 0.06, c: 0.12 };
export const BOOM_SPEED = 7.5;
export const BIG_CUP_R = 0.36;
export type StepOpts = { cupR?: number; ghost?: boolean };
/** x offset of a moving wall at time t. */
export const moverOffset = (m: { amp: number; speed: number }, t: number) => m.amp * Math.sin(t * m.speed);
const STEP = 1 / 240;

export type Ball = { x: number; z: number; vx: number; vz: number; moving: boolean };
export type StepEvent = "sunk" | "water" | "stopped" | "bounce" | "pad" | "teleport" | "boom" | null;

const inRect = (r: Rect, x: number, z: number) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2;

/** All solid boxes: user walls + 4 boundary walls. */
export function solidBoxes(h: Hole): Rect[] {
  const b = h.bounds, t = 0.2;
  return [
    ...h.walls,
    { x1: b.x1 - t, z1: b.z1 - t, x2: b.x2 + t, z2: b.z1 },
    { x1: b.x1 - t, z1: b.z2, x2: b.x2 + t, z2: b.z2 + t },
    { x1: b.x1 - t, z1: b.z1, x2: b.x1, z2: b.z2 },
    { x1: b.x2, z1: b.z1, x2: b.x2 + t, z2: b.z2 },
  ];
}

function reflect(ball: Ball, nx: number, nz: number, bvx = 0, bvz = 0) {
  const rvx = ball.vx - bvx, rvz = ball.vz - bvz;
  const dot = rvx * nx + rvz * nz;
  if (dot < 0) {
    ball.vx = rvx - (1 + RESTITUTION) * dot * nx + bvx;
    ball.vz = rvz - (1 + RESTITUTION) * dot * nz + bvz;
    return Math.abs(dot) > 0.4;
  }
  return false;
}

function collideBox(ball: Ball, r: Rect): boolean {
  const cx = Math.max(r.x1, Math.min(ball.x, r.x2));
  const cz = Math.max(r.z1, Math.min(ball.z, r.z2));
  const dx = ball.x - cx, dz = ball.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= BALL_R * BALL_R || d2 === 0) return false;
  const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
  ball.x = cx + nx * BALL_R;
  ball.z = cz + nz * BALL_R;
  return reflect(ball, nx, nz);
}

export function spinnerAngle(speed: number, t: number) {
  return t * speed;
}

export function step(ball: Ball, hole: Hole, boxes: Rect[], dt: number, time: number, opts: StepOpts = {}): StepEvent {
  if (!ball.moving) return null;
  const cupR = opts.cupR ?? CUP_R;
  if (opts.ghost) boxes = boxes.slice(hole.walls.length); // ghost ball floats through inner walls
  let ev: StepEvent = null;
  const n = Math.max(1, Math.ceil(dt / STEP));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const t = time + i * h;
    // surface forces
    const sand = hole.sand.some((r) => inRect(r, ball.x, ball.z));
    const f = sand ? SAND : (hole.mud ?? []).some((r) => inRect(r, ball.x, ball.z)) ? MUD : (hole.ice ?? []).some((r) => inRect(r, ball.x, ball.z)) ? ICE : GRASS;
    let onSlope = false;
    for (const s of hole.slopes) if (inRect(s, ball.x, ball.z)) { ball.vx += s.fx * h; ball.vz += s.fz * h; onSlope = true; }
    // cup attraction when slow and close
    const cdx = hole.cup[0] - ball.x, cdz = hole.cup[1] - ball.z;
    const cd = Math.hypot(cdx, cdz);
    if (cd < cupR * 1.6 && cd > 0.001) { ball.vx += (cdx / cd) * 2.5 * h; ball.vz += (cdz / cd) * 2.5 * h; }

    const damp = Math.exp(-f.k * h);
    ball.vx *= damp; ball.vz *= damp;
    let sp = Math.hypot(ball.vx, ball.vz);
    if (sp > 0) { const ns = Math.max(0, sp - f.c * h); ball.vx *= ns / sp; ball.vz *= ns / sp; sp = ns; }

    ball.x += ball.vx * h;
    ball.z += ball.vz * h;

    for (const b of boxes) if (collideBox(ball, b)) ev = "bounce";
    if (!opts.ghost) for (const m of hole.movers ?? []) {
      const o = moverOffset(m, t), v = m.amp * m.speed * Math.cos(t * m.speed);
      const r = { x1: m.x1 + o, z1: m.z1, x2: m.x2 + o, z2: m.z2 };
      const cx = Math.max(r.x1, Math.min(ball.x, r.x2)), cz = Math.max(r.z1, Math.min(ball.z, r.z2));
      const dx = ball.x - cx, dz = ball.z - cz, d = Math.hypot(dx, dz);
      if (d < BALL_R) {
        const nx = d > 0 ? dx / d : (ball.x < (r.x1 + r.x2) / 2 ? -1 : 1), nz = d > 0 ? dz / d : 0;
        ball.x = cx + nx * BALL_R; ball.z = cz + nz * BALL_R;
        if (reflect(ball, nx, nz, v, 0)) ev = "bounce";
      }
    }
    for (const tp of hole.teleports ?? []) {
      if (Math.hypot(ball.x - tp.a[0], ball.z - tp.a[1]) < 0.22) { ball.x = tp.b[0]; ball.z = tp.b[1]; ev = "teleport"; }
    }
    for (const b of hole.booms ?? []) {
      if (Math.hypot(ball.x - b.x, ball.z - b.z) < b.r) {
        const a = (t * 7.31 + b.x * 3.7 + b.z * 1.3) % (Math.PI * 2);
        ball.vx = Math.sin(a) * BOOM_SPEED; ball.vz = Math.cos(a) * BOOM_SPEED;
        ball.x = b.x + Math.sin(a) * (b.r + 0.02); ball.z = b.z + Math.cos(a) * (b.r + 0.02);
        ev = "boom";
      }
    }
    for (const p of hole.pads ?? []) {
      if (ball.z < p.z1 || ball.z > p.z2) continue;
      if (Math.abs(ball.x - p.x) > BALL_R + 0.03) continue;
      if (ball.vx * p.dir >= PAD_SPEED * 0.9) continue;
      ball.x = p.x + p.dir * (BALL_R + 0.03);
      ball.vx = p.dir * PAD_SPEED;
      ev = "pad";
    }
    for (const b of hole.bumpers) {
      const dx = ball.x - b.x, dz = ball.z - b.z, d = Math.hypot(dx, dz), m = b.r + BALL_R;
      if (d < m && d > 0) {
        const nx = dx / d, nz = dz / d;
        ball.x = b.x + nx * m; ball.z = b.z + nz * m;
        if (reflect(ball, nx, nz)) ev = "bounce";
        // bumpers are springy
        ball.vx += nx * 0.6; ball.vz += nz * 0.6;
      }
    }
    for (const s of hole.spinners) {
      const a = spinnerAngle(s.speed, t);
      const c = Math.cos(a), sn = Math.sin(a);
      const px = ball.x - s.x, pz = ball.z - s.z;
      // to local frame (bar along local x)
      const lx = c * px + sn * pz, lz = -sn * px + c * pz;
      const hw = 0.09;
      const qx = Math.max(-s.half, Math.min(lx, s.half)), qz = Math.max(-hw, Math.min(lz, hw));
      const dx = lx - qx, dz = lz - qz, d = Math.hypot(dx, dz);
      if (d < BALL_R && d > 0) {
        const lnx = dx / d, lnz = dz / d;
        const nlx = qx + lnx * BALL_R, nlz = qz + lnz * BALL_R;
        ball.x = s.x + c * nlx - sn * nlz;
        ball.z = s.z + sn * nlx + c * nlz;
        const nx = c * lnx - sn * lnz, nz = sn * lnx + c * lnz;
        const wx = ball.x - s.x, wz = ball.z - s.z;
        if (reflect(ball, nx, nz, -s.speed * wz, s.speed * wx)) ev = "bounce";
      }
    }

    if (hole.water.some((r) => inRect(r, ball.x, ball.z))) { ball.moving = false; ball.vx = ball.vz = 0; return "water"; }
    const cd2 = Math.hypot(hole.cup[0] - ball.x, hole.cup[1] - ball.z);
    if (cd2 < cupR - BALL_R * 0.3 && sp < SINK_SPEED) {
      ball.moving = false; ball.vx = ball.vz = 0; ball.x = hole.cup[0]; ball.z = hole.cup[1];
      return "sunk";
    }
    if (!onSlope && sp < REST_SPEED) { ball.moving = false; ball.vx = ball.vz = 0; return "stopped"; }
  }
  return ev;
}

export function scoreName(strokes: number, par: number) {
  if (strokes === 1) return "Hole in one!";
  const d = strokes - par;
  return ({ [-3]: "Albatross!", [-2]: "Eagle!", [-1]: "Birdie!", 0: "Par", 1: "Bogey", 2: "Double bogey" } as Record<number, string>)[d] ?? `+${d}`;
}
