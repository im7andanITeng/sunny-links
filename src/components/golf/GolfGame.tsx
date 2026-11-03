import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, Lightformer, Sky, ContactShadows } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { computeStars, getHole, HOLES_PER_LEVEL, holeInLevel, levelOf, type Hole, type Rect } from "@/game/course";
import { BALL_R, BIG_CUP_R, CUP_R, MAX_SPEED, moverOffset, solidBoxes, spinnerAngle, step, scoreName, type Ball } from "@/game/physics";
import type { Mover, PowerKind, PowerUp } from "@/game/course";
import { getSkin, drawSkin, loadSkinId } from "@/game/skins";
import { playHit, playCup, playSplash, playBounce, playLevelUp, playCoin, playPad } from "@/game/sound";
import { coinMultiplier, isVip } from "@/game/vip";
import { COIN_R, COIN_VALUE, addCoins, coinsFor, loadCoins } from "@/game/coins";
import { freshProgress, loadProgress, saveProgress, showPuttingTips, type Progress } from "@/game/progress";
import { cheatHole, hasCheats, rainCoins, useCheats, type Cheats } from "@/game/cheats";
import { Button } from "@/components/ui/button";

const MAX_DRAG = 3;

/** Phone/tablet builds get touch wording; desktop keeps the mouse hints. */
const TOUCH =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

/** Flickering red/cyan ghost copies that jitter around the glitch ball. */
function GlitchFx() {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const on = Math.random() < 0.35;
    for (const [m, s] of [[a.current, 1], [b.current, -1]] as const) {
      if (!m) continue;
      m.visible = on;
      if (on) m.position.set(s * (0.02 + Math.random() * 0.05), (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.05);
    }
  });
  return (
    <>
      <mesh ref={a}><icosahedronGeometry args={[BALL_R * 1.03, 2]} /><meshBasicMaterial color="#ff2bd6" transparent opacity={0.45} wireframe /></mesh>
      <mesh ref={b}><icosahedronGeometry args={[BALL_R * 1.03, 2]} /><meshBasicMaterial color="#00ffd5" transparent opacity={0.45} wireframe /></mesh>
    </>
  );
}

function grassTexture(light = "#5fae4a", dark = "#529d40") {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  if (!g) return new THREE.Texture();
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? light : dark; g.fillRect(0, i * 32, 256, 32); }
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,40,0"},${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function noiseTexture(base: string, spread: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (!g) return new THREE.Texture();
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "60,40,0"},${Math.random() * spread})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const cx = (r: Rect) => (r.x1 + r.x2) / 2;
const cz = (r: Rect) => (r.z1 + r.z2) / 2;
const w = (r: Rect) => r.x2 - r.x1;
const d = (r: Rect) => r.z2 - r.z1;

function Course({ hole, cupR = CUP_R, ghost = false, spooky = false }: { hole: Hole; cupR?: number; ghost?: boolean; spooky?: boolean }) {
  const boxes = useMemo(() => solidBoxes(hole), [hole]);
  const grass = useMemo(() => grassTexture(spooky ? "#2c4a26" : "#5fae4a", spooky ? "#233d1e" : "#529d40"), [spooky]);
  const rough = useMemo(() => grassTexture(spooky ? "#1e3519" : "#4a8a3a", spooky ? "#192c15" : "#447f35"), [spooky]);
  const sand = useMemo(() => noiseTexture("#e3cf98", 0.15), []);
  const wood = useMemo(() => noiseTexture("#a8754a", 0.12), []);
  const b = hole.bounds;
  const gTex = useMemo(() => { const t = grass.clone(); t.repeat.set(w(b) / 2, d(b) / 2); t.needsUpdate = true; return t; }, [grass, b]);
  const rTex = useMemo(() => { const t = rough.clone(); t.repeat.set(30, 30); t.needsUpdate = true; return t; }, [rough]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx(b), -0.06, cz(b)]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial map={rTex} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx(b), 0, cz(b)]} receiveShadow>
        <planeGeometry args={[w(b), d(b)]} />
        <meshStandardMaterial map={gTex} roughness={0.9} />
      </mesh>
      {boxes.map((r, i) => (
        <mesh key={i} position={[cx(r), 0.1, cz(r)]} castShadow receiveShadow>
          <boxGeometry args={[w(r), 0.32, d(r)]} />
          <meshStandardMaterial map={wood} roughness={0.7} transparent={ghost && i < hole.walls.length} opacity={ghost && i < hole.walls.length ? 0.35 : 1} />
        </mesh>
      ))}
      {hole.sand.map((r, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[cx(r), 0.004, cz(r)]} receiveShadow>
          <planeGeometry args={[w(r), d(r)]} />
          <meshStandardMaterial map={sand} roughness={1} />
        </mesh>
      ))}
      {(hole.mud ?? []).map((r, i) => (
        <mesh key={`mud${i}`} rotation-x={-Math.PI / 2} position={[cx(r), 0.005, cz(r)]} receiveShadow>
          <planeGeometry args={[w(r), d(r)]} />
          <meshStandardMaterial color="#5a3b22" roughness={1} />
        </mesh>
      ))}
      {(hole.ice ?? []).map((r, i) => (
        <mesh key={`ice${i}`} rotation-x={-Math.PI / 2} position={[cx(r), 0.005, cz(r)]}>
          <planeGeometry args={[w(r), d(r)]} />
          <meshPhysicalMaterial color="#cfefff" roughness={0.05} clearcoat={1} transparent opacity={0.9} />
        </mesh>
      ))}
      {(hole.movers ?? []).map((m, i) => <MoverMesh key={`mv${i}`} m={m} ghost={ghost} />)}
      {(hole.teleports ?? []).map((t, i) => (
        <group key={`tp${i}`}>
          <mesh rotation-x={-Math.PI / 2} position={[t.a[0], 0.009, t.a[1]]}>
            <circleGeometry args={[0.24, 32]} />
            <meshBasicMaterial color="#7b2ff7" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[t.a[0], 0.011, t.a[1]]}>
            <ringGeometry args={[0.24, 0.3, 32]} />
            <meshBasicMaterial color="#d6b8ff" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[t.b[0], 0.009, t.b[1]]}>
            <ringGeometry args={[0.18, 0.28, 32]} />
            <meshBasicMaterial color="#b98cff" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
      {(hole.booms ?? []).map((b, i) => (
        <group key={`bm${i}`} position={[b.x, 0, b.z]}>
          <mesh position-y={0.02}>
            <cylinderGeometry args={[b.r, b.r, 0.04, 24]} />
            <meshStandardMaterial color="#222" emissive="#ff3b1f" emissiveIntensity={0.6} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.045}>
            <circleGeometry args={[b.r * 0.45, 5]} />
            <meshBasicMaterial color="#ffd23f" />
          </mesh>
        </group>
      ))}
      {hole.water.map((r, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[cx(r), 0.006, cz(r)]}>
          <planeGeometry args={[w(r), d(r)]} />
          <meshPhysicalMaterial color="#2f8fc4" roughness={0.05} metalness={0.1} transparent opacity={0.88} clearcoat={1} />
        </mesh>
      ))}
      {hole.slopes.map((s, i) => {
        const ang = Math.atan2(s.fx, s.fz);
        const arrows: [number, number][] = [];
        for (let x = s.x1 + 0.6; x < s.x2; x += 1.2)
          for (let z = s.z1 + 0.6; z < s.z2; z += 1.2) arrows.push([x, z]);
        return (
          <group key={i}>
            <mesh rotation-x={-Math.PI / 2} position={[cx(s), 0.003, cz(s)]} receiveShadow>
              <planeGeometry args={[w(s), d(s)]} />
              <meshStandardMaterial color="#7cc25e" roughness={0.9} transparent opacity={0.55} />
            </mesh>
            {arrows.map(([x, z], j) => (
              <mesh key={j} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, ang + Math.PI]}>
                <circleGeometry args={[0.18, 3]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
              </mesh>
            ))}
          </group>
        );
      })}
      {hole.bumpers.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position-y={0.15} castShadow>
            <cylinderGeometry args={[p.r, p.r, 0.3, 32]} />
            <meshStandardMaterial color="#d8402f" roughness={0.4} />
          </mesh>
          <mesh position-y={0.31}>
            <cylinderGeometry args={[p.r * 0.7, p.r, 0.04, 32]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* tee mat */}
      <mesh rotation-x={-Math.PI / 2} position={[hole.tee[0], 0.005, hole.tee[1]]}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshStandardMaterial color="#2f6d34" roughness={1} />
      </mesh>
      {/* cup + flag */}
      <group position={[hole.cup[0], 0, hole.cup[1]]}>
        <mesh rotation-x={-Math.PI / 2} position-y={0.007}>
          <ringGeometry args={[cupR, cupR + 0.03, 40]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.008}>
          <circleGeometry args={[cupR, 40]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
          <meshStandardMaterial color="#f1efe8" metalness={0.3} roughness={0.4} />
        </mesh>
        <Flag />
      </group>
      {hole.spinners.map((s, i) => <SpinnerMesh key={i} s={s} />)}
      {(hole.pads ?? []).map((p, i) => (
        <group key={`pad${i}`} position={[p.x + p.dir * 0.03, 0.14, (p.z1 + p.z2) / 2]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 0.26, p.z2 - p.z1]} />
            <meshStandardMaterial color="#ffb703" emissive="#ff7a00" emissiveIntensity={0.35} roughness={0.4} />
          </mesh>
          {[-0.3, 0, 0.3].map((o) => (
            <mesh key={o} position={[p.dir * 0.12, -0.13, o]} rotation={[-Math.PI / 2, 0, p.dir > 0 ? -Math.PI / 2 : Math.PI / 2]}>
              <circleGeometry args={[0.1, 3]} />
              <meshBasicMaterial color="#ff7a00" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Flag() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 2) * 0.25; });
  return (
    <mesh ref={ref} position={[0, 1.6, 0]} castShadow>
      <boxGeometry args={[0.02, 0.35, 0.55]} />
      <meshStandardMaterial color="#e23b2e" roughness={0.6} />
    </mesh>
  );
}

function SpinnerMesh({ s }: { s: Hole["spinners"][number] }) {
  const ref = useRef<THREE.Group>(null);
  const clockRef = useGameClock();
  useFrame(() => { if (ref.current) ref.current.rotation.y = -spinnerAngle(s.speed, clockRef.current); });
  return (
    <group position={[s.x, 0, s.z]}>
      <group ref={ref}>
        <mesh position-y={0.12} castShadow>
          <boxGeometry args={[s.half * 2, 0.18, 0.18]} />
          <meshStandardMaterial color="#f2f0ea" roughness={0.5} />
        </mesh>
        <mesh position={[s.half * 0.5, 0.12, 0]}><boxGeometry args={[0.2, 0.19, 0.19]} /><meshStandardMaterial color="#d8402f" /></mesh>
        <mesh position={[-s.half * 0.5, 0.12, 0]}><boxGeometry args={[0.2, 0.19, 0.19]} /><meshStandardMaterial color="#d8402f" /></mesh>
      </group>
      <mesh position-y={0.3} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.6, 16]} />
        <meshStandardMaterial color="#7a4e2e" />
      </mesh>
      <mesh position-y={0.7} castShadow>
        <coneGeometry args={[0.22, 0.3, 16]} />
        <meshStandardMaterial color="#d8402f" />
      </mesh>
    </group>
  );
}

function MoverMesh({ m, ghost }: { m: Mover; ghost: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => { if (ref.current) ref.current.position.x = (m.x1 + m.x2) / 2 + moverOffset(m, simClock.current); });
  return (
    <mesh ref={ref} position={[(m.x1 + m.x2) / 2, 0.14, (m.z1 + m.z2) / 2]} castShadow>
      <boxGeometry args={[m.x2 - m.x1, 0.28, m.z2 - m.z1]} />
      <meshStandardMaterial color="#3a86ff" roughness={0.4} transparent={ghost} opacity={ghost ? 0.35 : 1} />
    </mesh>
  );
}

const POWER_LOOK: Record<PowerKind, { color: string; label: string }> = {
  bigcup: { color: "#ffd23f", label: "🎯 Big Cup! The hole got bigger" },
  ghost: { color: "#f2f2ff", label: "👻 Ghost Ball! Next shot goes through walls" },
  aim: { color: "#3ddc84", label: "📏 Aim Line! See where your shot goes" },
};

function PowerMesh({ p, gone }: { p: PowerUp; gone: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.elapsedTime * 1.8; ref.current.position.y = 0.32 + Math.sin(clock.elapsedTime * 2.5) * 0.06; } });
  if (gone) return null;
  const c = POWER_LOOK[p.kind].color;
  return (
    <group ref={ref} position={[p.x, 0.32, p.z]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.5} transparent opacity={p.kind === "ghost" ? 0.7 : 1} />
      </mesh>
    </group>
  );
}

// shared sim clock
const simClock = { current: 0 };
const useGameClock = () => simClock;

type Props = {
  hole: Hole;
  holeKey: number;
  onStroke: () => void;
  onPenalty: () => void;
  onStuck: () => void;
  onSunk: () => void;
  canShoot: boolean;
  resume: Progress | null;
  onSnapshot: (ball: Ball, lastPos: [number, number], clock: number) => void;
  coinSpots: [number, number][];
  takenCoins: number[];
  onCoin: (i: number) => void;
  onPower: (kind: PowerKind) => void;
  cheats: Cheats;
};

function CoinMesh({ x, z, gone }: { x: number; z: number; gone: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.elapsedTime * 2.5; ref.current.position.y = 0.28 + Math.sin(clock.elapsedTime * 3 + x) * 0.05; } });
  if (gone) return null;
  return (
    <group ref={ref} position={[x, 0.28, z]}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[COIN_R, COIN_R, 0.04, 24]} />
        <meshStandardMaterial color="#ffcc33" emissive="#7a5200" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Scene({ hole, holeKey, onStroke, onPenalty, onStuck, onSunk, canShoot, resume, onSnapshot, coinSpots, takenCoins, onCoin, onPower, cheats }: Props) {
  const holeRef = useRef(hole);
  holeRef.current = hole;
  const [powers, setPowers] = useState<{ taken: number[]; bigcup: boolean; ghost: boolean; aim: boolean }>({ taken: [], bigcup: false, ghost: false, aim: false });
  const powersRef = useRef(powers);
  powersRef.current = powers;
  const ghostShot = useRef(false);
  const aimPts = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: "#ffffff", size: 0.07, transparent: true, opacity: 0.85 }));
    pts.visible = false; pts.frustumCulled = false;
    return pts;
  }, []);
  const taken = useRef(new Set(takenCoins));
  const boxes = useMemo(() => solidBoxes(hole), [hole]);
  const skin = useMemo(() => getSkin(loadSkinId()), []);
  const skinTex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    drawSkin(c.getContext("2d")!, skin, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [skin]);
  const ball = useRef<Ball>({ x: hole.tee[0], z: hole.tee[1], vx: 0, vz: 0, moving: false });
  const lastPos = useRef<[number, number]>([hole.tee[0], hole.tee[1]]);
  const stuckTime = useRef(0);
  const ballMesh = useRef<THREE.Mesh>(null);
  const aimGroup = useRef<THREE.Group>(null);
  const aimBar = useRef<THREE.Mesh>(null);
  const aimMat = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const controls = useRef<any>(null);
  const aiming = useRef<{ x: number; z: number } | null>(null);
  const sinkAnim = useRef(0);
  const saveTimer = useRef(0);
  const snapshotRef = useRef(onSnapshot);
  snapshotRef.current = onSnapshot;
  const { camera } = useThree();

  useEffect(() => {
    const h = holeRef.current;
    ball.current = resume ? { ...resume.ball } : { x: h.tee[0], z: h.tee[1], vx: 0, vz: 0, moving: false };
    lastPos.current = resume ? [...resume.lastPos] : [h.tee[0], h.tee[1]];
    sinkAnim.current = resume?.sunk ? 1 : 0;
    simClock.current = resume?.clock ?? 0;
    const dirX = h.cup[0] - h.tee[0], dirZ = h.cup[1] - h.tee[1];
    const len = Math.hypot(dirX, dirZ) || 1;
    camera.position.set(ball.current.x - (dirX / len) * 5.5, 6, ball.current.z - (dirZ / len) * 5.5);
    if (controls.current) { controls.current.target.set(ball.current.x, 0, ball.current.z); controls.current.update(); }
    (window as any).__game = { ball: ball.current, hole: h };
    const flush = () => snapshotRef.current({ ...ball.current }, [...lastPos.current], simClock.current);
    const visibility = () => { if (document.hidden) flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [holeKey, camera, resume]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pw = powersRef.current;
    const wasMoving = ball.current.moving;
    const ev = step(ball.current, hole, boxes, dt, simClock.current, { cupR: (pw.bigcup ? BIG_CUP_R : CUP_R) * cheats.cupScale, ghost: ghostShot.current || cheats.ghost });
    if (wasMoving && !ball.current.moving && ghostShot.current) ghostShot.current = false;
    (hole.powerups ?? []).forEach((p, i) => {
      if (pw.taken.includes(i) || Math.hypot(ball.current.x - p.x, ball.current.z - p.z) > 0.3) return;
      const nextP = { ...pw, taken: [...pw.taken, i], [p.kind]: true };
      powersRef.current = nextP; setPowers(nextP); playCoin(); onPower(p.kind);
    });
    simClock.current += dt;
    saveTimer.current += dt;
    if (saveTimer.current >= 0.5) {
      saveTimer.current = 0;
      snapshotRef.current({ ...ball.current }, [...lastPos.current], simClock.current);
    }
    if (ev === "bounce") playBounce();
    if (ev === "pad" || ev === "boom" || ev === "teleport") playPad();
    coinSpots.forEach(([x, z], i) => {
      if (taken.current.has(i)) return;
      if (Math.hypot(ball.current.x - x, ball.current.z - z) < COIN_R + BALL_R + 0.05) { taken.current.add(i); playCoin(); onCoin(i); }
    });
    if (ev === "water") {
      playSplash();
      ball.current.x = lastPos.current[0]; ball.current.z = lastPos.current[1];
      onPenalty();
    }
    if (ev === "sunk") { playCup(); sinkAnim.current = 0.001; onSunk(); }
    // Stuck: ball still "moving" but barely going anywhere for 5s → back to last shot spot.
    if (ball.current.moving && Math.hypot(ball.current.vx, ball.current.vz) < 0.35) {
      stuckTime.current += dt;
      if (stuckTime.current > 5) {
        stuckTime.current = 0;
        Object.assign(ball.current, { x: lastPos.current[0], z: lastPos.current[1], vx: 0, vz: 0, moving: false });
        onStuck();
      }
    } else stuckTime.current = 0;

    const b = ball.current;
    if (ballMesh.current) {
      let y = BALL_R;
      if (sinkAnim.current > 0) { sinkAnim.current = Math.min(1, sinkAnim.current + dt * 3); y = BALL_R - sinkAnim.current * 0.3; }
      ballMesh.current.position.set(b.x, y, b.z);
      ballMesh.current.scale.setScalar(cheats.ballScale);
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0) {
        const axis = new THREE.Vector3(b.vz, 0, -b.vx).normalize();
        ballMesh.current.rotateOnWorldAxis(axis, (sp * dt) / BALL_R);
      }
    }
    if (ring.current) {
      ring.current.visible = !b.moving && canShoot && !aiming.current;
      ring.current.position.set(b.x, 0.012, b.z);
      const s = 1 + Math.sin(simClock.current * 4) * 0.12;
      ring.current.scale.set(s, s, s);
    }
    if (controls.current) {
      const t = controls.current.target as THREE.Vector3;
      const k = 1 - Math.exp(-3 * dt);
      const dx = (b.x - t.x) * k, dz = (b.z - t.z) * k;
      t.x += dx; t.z += dz;
      camera.position.x += dx; camera.position.z += dz;
      controls.current.update();
    }
  });

  const updateAim = (px: number, pz: number) => {
    const b = ball.current;
    const dx = b.x - px, dz = b.z - pz;
    const dist = Math.min(Math.hypot(dx, dz), MAX_DRAG);
    const p = dist / MAX_DRAG;
    if (aimGroup.current && aimBar.current && aimMat.current) {
      aimGroup.current.visible = dist > 0.05;
      aimGroup.current.position.set(b.x, 0.03, b.z);
      aimGroup.current.rotation.y = Math.atan2(dx, dz);
      const L = 0.3 + p * 2.6;
      aimBar.current.scale.set(1, 1, L);
      aimBar.current.position.z = L / 2 + BALL_R;
      aimMat.current.color.setHSL(0.33 - p * 0.33, 0.85, 0.55);
    }
    aimPts.visible = (powersRef.current.aim || cheats.aim) && dist > 0.05;
    if (aimPts.visible) {
      const len = Math.hypot(dx, dz) || 1, speed = (p * p * 0.35 * MAX_SPEED + p * 0.65 * MAX_SPEED) * cheats.speedMult;
      const sim: Ball = { x: b.x, z: b.z, vx: (dx / len) * speed, vz: (dz / len) * speed, moving: true };
      const arr = (aimPts.geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
      let t = simClock.current;
      for (let k = 0; k < 60; k++) {
        for (let j = 0; j < 3; j++) { step(sim, hole, boxes, 1 / 60, t, { cupR: (powersRef.current.bigcup ? BIG_CUP_R : CUP_R) * cheats.cupScale, ghost: (powersRef.current.ghost && !ghostShot.current) || cheats.ghost }); t += 1 / 60; }
        arr[k * 3] = sim.x; arr[k * 3 + 1] = 0.04; arr[k * 3 + 2] = sim.z;
      }
      aimPts.geometry.getAttribute("position").needsUpdate = true;
    }
    return { dx, dz, p };
  };

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0 || ball.current.moving || !canShoot) return;
    e.stopPropagation();
    (e.target as any).setPointerCapture?.(e.pointerId);
    aiming.current = { x: e.point.x, z: e.point.z };
    updateAim(e.point.x, e.point.z);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!aiming.current) return;
    aiming.current = { x: e.point.x, z: e.point.z };
    updateAim(e.point.x, e.point.z);
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!aiming.current) return;
    const { dx, dz, p } = updateAim(e.point.x, e.point.z);
    aiming.current = null;
    (e.target as any).releasePointerCapture?.(e.pointerId);
    if (aimGroup.current) aimGroup.current.visible = false;
    aimPts.visible = false;
    if (p < 0.03) return;
    if (powersRef.current.ghost) { ghostShot.current = true; const nextP = { ...powersRef.current, ghost: false }; powersRef.current = nextP; setPowers(nextP); }
    const len = Math.hypot(dx, dz);
    const speed = (p * p * 0.35 * MAX_SPEED + p * 0.65 * MAX_SPEED) * cheats.speedMult;
    lastPos.current = [ball.current.x, ball.current.z];
    ball.current.vx = (dx / len) * speed;
    ball.current.vz = (dz / len) * speed;
    ball.current.moving = true;
    playHit(p);
    onStroke();
  };
  const onCancel = () => {
    aiming.current = null;
    if (aimGroup.current) aimGroup.current.visible = false;
    aimPts.visible = false;
  };

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        mouseButtons={{ LEFT: undefined as any, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: undefined as any, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        enablePan={false}
        minDistance={2.5}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.3}
      />
      <Course hole={hole} cupR={(powers.bigcup ? BIG_CUP_R : CUP_R) * cheats.cupScale} ghost={powers.ghost || cheats.ghost} spooky={cheats.spooky} />
      {(hole.powerups ?? []).map((p, i) => <PowerMesh key={`pw${i}`} p={p} gone={powers.taken.includes(i)} />)}
      <primitive object={aimPts} />
      {coinSpots.map(([x, z], i) => <CoinMesh key={i} x={x} z={z} gone={takenCoins.includes(i)} />)}
      <mesh ref={ballMesh} castShadow>
        <icosahedronGeometry args={[BALL_R, 3]} />
        <meshStandardMaterial map={skinTex} emissive={skin.emissive} metalness={skin.metalness} roughness={skin.roughness} />
        {skin.pattern === "glitch" && <GlitchFx />}
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[BALL_R + 0.08, BALL_R + 0.12, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      <group ref={aimGroup} visible={false}>
        <mesh ref={aimBar} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.07, 1]} />
          <meshBasicMaterial ref={aimMat} color="#7cd36b" transparent opacity={0.9} />
        </mesh>
      </group>
      {/* invisible input plane */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} visible={false}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}

export default function GolfGame({ onLevelComplete, onMenu, daily }: { onLevelComplete?: (levelsPassed: number) => void; onMenu?: () => void; daily?: { hole: Hole; onDone: (strokes: number) => void } } = {}) {
  const [initial] = useState(() => (daily ? freshProgress(0) : loadProgress()));
  const save = (p: Progress) => { if (!daily) saveProgress(p); };
  const [holeIdx, setHoleIdx] = useState(initial.holeIdx);
  const [strokes, setStrokes] = useState(initial.strokes);
  const [scores, setScores] = useState<number[]>(initial.scores);
  const [sunk, setSunk] = useState(initial.sunk);
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [taken, setTaken] = useState<number[]>(initial.coins ?? []);
  const [wallet, setWallet] = useState(0);
  useEffect(() => setWallet(loadCoins()), []);
  const round = 0;
  const progress = useRef<Progress>(initial);
  progress.current = { ...progress.current, holeIdx, strokes, scores, sunk, coins: taken };
  useEffect(() => { save(progress.current); }, [holeIdx, strokes, scores, sunk, taken]);
  const cheats = useCheats();
  const rawHole = daily ? daily.hole : getHole(holeIdx);
  const hole = useMemo(() => cheatHole(rawHole, cheats), [rawHole, cheats]);
  const coinSpots = useMemo(() => (cheats.coinRain ? rainCoins(hole, holeIdx) : coinsFor(hole, holeIdx)), [hole, holeIdx, cheats.coinRain]);
  const strokesRef = useRef(0);
  strokesRef.current = strokes;
  const finished = false;
  const level = levelOf(holeIdx);
  const slot = holeInLevel(holeIdx);
  const levelEnd = !daily && slot === HOLES_PER_LEVEL - 1;

  useEffect(() => {
    if (daily) return;
    const intro: Record<number, string> = { 18: "✨ New: Power-ups!", 24: "🟫 New: Mud — the ball gets slow!", 30: "🧊 New: Ice — the ball slides!", 36: "🧱 New: Moving walls — time it!", 42: "🌀 New: Teleport holes!", 48: "💣 New: Boom pads!" };
    if (hole.boss) setToast("👑 BOSS HOLE! Extra coins!");
    else if (intro[holeIdx]) setToast(intro[holeIdx]!);
  }, [holeIdx]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 1800); return () => clearTimeout(t); }, [toast]);

  const best = typeof window !== "undefined" ? null : null;
  void best;

  const next = () => {
    progress.current = freshProgress(holeIdx + 1, scores);
    save(progress.current);
    setHoleIdx(holeIdx + 1); setStrokes(0); setSunk(false); setTaken([]);
  };

    const total = scores.reduce((a, b) => a + b, 0);
  const parSoFar = scores.reduce((a, _, i) => a + getHole(i).par, 0);
  const rel = total - parSoFar;

  const fmt = (n: number) => (n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`);

  // scorecard for the level in progress
  const levelStart = level * HOLES_PER_LEVEL;
  const levelHoles = Array.from({ length: HOLES_PER_LEVEL }, (_, k) => getHole(levelStart + k));
  const levelScores = scores.slice(levelStart, levelStart + HOLES_PER_LEVEL);
  const levelStrokes = levelScores.reduce((a, b) => a + b, 0);
  const levelPar = levelHoles.slice(0, levelScores.length).reduce((a, h) => a + h.par, 0);
  const levelRel = levelStrokes - levelPar;

  return (
    <div className="golf-root" data-scene-ready={ready ? "" : undefined}>
      <Canvas shadows dpr={[1, TOUCH ? 1.25 : 2]} gl={{ antialias: !TOUCH, powerPreference: "high-performance" }} camera={{ fov: TOUCH ? 60 : 50, position: [0, 5, -4] }} onCreated={() => requestAnimationFrame(() => setReady(true))}>
        {cheats.spooky ? <color attach="background" args={["#07040e"]} /> : <Sky sunPosition={[30, 40, -20]} turbidity={4} rayleigh={1.2} />}
        <hemisphereLight args={cheats.spooky ? ["#3b2a5e", "#120a1e", 0.35] : ["#cfe8ff", "#4d7a3a", 0.5]} />
        <directionalLight
          position={[8, 14, -6]}
          intensity={cheats.spooky ? 0.9 : 2.2}
          color={cheats.spooky ? "#b18cff" : "#ffffff"}
          castShadow
          shadow-mapSize={TOUCH ? [1024, 1024] : [2048, 2048]}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-camera-far={60}
          shadow-bias={-0.0005}
        />
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={1} color="#bfe0ff" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        </Environment>
        <fog attach="fog" args={cheats.spooky ? ["#150a24", 6, 30] : ["#cfe3ee", 25, 60]} />
        <group position={[0, 0, 0]}>
          <Scene
            key={`${round}-${holeIdx}`}
            hole={hole}
            cheats={cheats}
            holeKey={holeIdx}
            resume={!daily && holeIdx === initial.holeIdx ? initial : null}
            onSnapshot={(ball, lastPos, clock) => {
              if (progress.current.holeIdx !== holeIdx) return;
              progress.current = { ...progress.current, ball, lastPos, clock };
              save(progress.current);
            }}
            canShoot={!sunk && !finished}
            coinSpots={coinSpots}
            takenCoins={taken}
            onCoin={(i) => { setTaken((t) => (t.includes(i) ? t : [...t, i])); setWallet(addCoins(COIN_VALUE * coinMultiplier(isVip()))); }}
            onPower={(k) => setToast(POWER_LOOK[k].label)}
            onStroke={() => setStrokes((s) => s + 1)}
            onPenalty={() => { setStrokes((s) => s + 1); setToast("Splash! +1 penalty"); }}
            onStuck={() => { setStrokes((s) => s + 1); setToast("You got stuck! +1 Penalty"); playPad(); }}
            onSunk={() => {
              const s = strokesRef.current;
              setSunk(true);
              setToast(scoreName(s, hole.par));
              setScores((arr) => (arr.length === holeIdx ? [...arr, s] : arr));
              if (daily) { setTimeout(playLevelUp, 450); daily.onDone(s); }
              if (levelEnd) { setTimeout(playLevelUp, 450); onLevelComplete?.(level + 1); }
            }}
          />
        </group>
        <ContactShadows position={[0, 0.001, 0]} opacity={0} />
      </Canvas>

      <div className="golf-hud-top">
        <div className="golf-panel">
          <div className="golf-label">{daily ? "📅 Daily Challenge" : `Level ${level + 1}`}</div>
          <div className="golf-title">{hole.name}</div>
          {!daily && <div className="golf-dots">
            {Array.from({ length: HOLES_PER_LEVEL }, (_, k) => (
              <span key={k} className={`golf-dot${k < (sunk ? slot + 1 : slot) ? " is-done" : ""}${k === slot ? " is-now" : ""}`} />
            ))}
          </div>}
        </div>
        <div className="golf-panel golf-stats">
          {!daily && <><div><div className="golf-label">Hole</div><div className="golf-num">{slot + 1}/{HOLES_PER_LEVEL}</div></div></>}
          <div><div className="golf-label">Par</div><div className="golf-num">{hole.par}</div></div>
          <div><div className="golf-label">Strokes</div><div className="golf-num">{strokes}</div></div>
          {!daily && <><div><div className="golf-label">Level</div><div className="golf-num">{fmt(levelRel)}</div></div>
          <div><div className="golf-label">Total</div><div className="golf-num">{fmt(rel)}</div></div></>}
          <div><div className="golf-label">Coins</div><div className="golf-num">🪙 {wallet}</div></div>
        </div>
        {hasCheats(cheats) && <div className="golf-panel golf-cheat-chip">🤖 Cheat mode</div>}
      </div>

      {onMenu && <Button variant="ghost" className="golf-btn golf-menu-btn" onClick={onMenu}>☰ Menu</Button>}
      {toast && <div className="golf-toast">{toast}</div>}

      {sunk && daily && (
        <div className="golf-modal-wrap">
          <div className="golf-modal">
            <div className="golf-label">Daily Challenge</div>
            <div className="golf-title-lg">Done! ✅</div>
            <div className="golf-label">{strokes} strokes · par {hole.par}</div>
            <Button variant="ghost" className="golf-btn mt-4" onClick={onMenu}>📅 Back to calendar</Button>
          </div>
        </div>
      )}

      {sunk && !daily && !levelEnd && (
        <div className="golf-center">
          <Button variant="ghost" className="golf-btn" onClick={next}>Next hole →</Button>
        </div>
      )}

      {sunk && levelEnd && (
        <div className="golf-modal-wrap">
          <div className="golf-modal">
            <div className="golf-label">Complete!</div>
            <div className="golf-title-lg">Level {level + 1}</div>
            <div className="golf-stars" aria-label={`${computeStars(levelStrokes, levelPar)} out of 3 stars`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < computeStars(levelStrokes, levelPar) ? "golf-star" : "golf-star golf-star-off"}>★</span>
              ))}
            </div>
            <table className="golf-table">
              <thead>
                <tr><th>Hole</th><th>Par</th><th>Strokes</th><th>±</th></tr>
              </thead>
              <tbody>
                {levelHoles.map((h, k) => {
                  const s = levelScores[k];
                  const diff = s === undefined ? null : s - h.par;
                  return (
                    <tr key={k}>
                      <td>{k + 1}. {h.name}</td>
                      <td>{h.par}</td>
                      <td>{s ?? "–"}</td>
                      <td className={diff === null ? "" : diff < 0 ? "golf-under" : diff > 0 ? "golf-over" : ""}>{diff === null ? "" : fmt(diff)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="golf-label">{levelStrokes} strokes · {levelPar} par · {fmt(levelRel)}</div>
            <Button variant="ghost" className="golf-btn mt-4" onClick={next}>Start Level {level + 2} →</Button>
          </div>
        </div>
      )}

      {!daily && showPuttingTips(holeIdx) && <div className="golf-help">
        {TOUCH
          ? "Drag back from the ball and release to putt · Two fingers to rotate · Pinch to zoom"
          : "Drag back from the ball and release to putt · Right-drag / two fingers to rotate · Scroll to zoom"}
      </div>}
    </div>
  );
}
