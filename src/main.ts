import type { GameState } from './game/types';
import { WORLD_W, WORLD_H } from './game/types';
import {
  createInitialState,
  tick,
  startBattle,
  setFormation,
  rotateSelected,
  moveSelectedToward,
  dragDeploy,
  restart,
  selectedUnit,
} from './game/sim';
import { render } from './game/render';
import { unitRadius, dist } from './game/combat';
import { mountHud } from './ui/hud';
import type { FormationKind } from './game/types';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const hudRoot = document.getElementById('hud') as HTMLElement;
const ctx = canvas.getContext('2d')!;

let state: GameState = createInitialState();
const bootParams = new URLSearchParams(location.search);
if (bootParams.get('auto') === '1') {
  startBattle(state);
}
if (bootParams.get('shot') === 'battle') {
  startBattle(state);
  // fast-forward ~25s of combat for screenshots
  for (let i = 0; i < 500; i++) tick(state, 0.05);
}

let draggingId: string | null = null;
let panning = false;
let lastPan = { x: 0, y: 0 };
let lastT = performance.now();

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const paintHud = mountHud(hudRoot, {
  onSelect: (id) => {
    state.selectedId = id;
  },
  onStart: () => startBattle(state),
  onRestart: () => {
    state = restart();
  },
  onPause: () => {
    if (state.phase === 'battle') state.paused = !state.paused;
  },
  onForm: (f) => setFormation(state, f),
});

function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  const cam = state.camera;
  return {
    x: cam.x + (sx - window.innerWidth / 2) / cam.zoom,
    y: cam.y + (sy - window.innerHeight / 2) / cam.zoom,
  };
}

function pickUnit(wx: number, wy: number, factionOnly = false): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const u of state.units) {
    if (factionOnly && u.faction !== state.playerFaction) continue;
    if (u.hp <= 0) continue;
    const d = dist({ x: wx, y: wy }, u);
    if (d < unitRadius(u) + 12 && d < bestD) {
      bestD = d;
      best = u.id;
    }
  }
  return best;
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  const w = screenToWorld(e.clientX, e.clientY);
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    panning = true;
    lastPan = { x: e.clientX, y: e.clientY };
    return;
  }
  if (e.button === 2) {
    if (state.phase === 'battle') moveSelectedToward(state, w.x, w.y);
    return;
  }
  if (e.button === 0) {
    const id = pickUnit(w.x, w.y, true);
    if (id) {
      state.selectedId = id;
      if (state.phase === 'deploy') draggingId = id;
    } else if (state.phase === 'battle' && selectedUnit(state)) {
      moveSelectedToward(state, w.x, w.y);
    }
  }
});

window.addEventListener('mousemove', (e) => {
  if (panning) {
    const dx = e.clientX - lastPan.x;
    const dy = e.clientY - lastPan.y;
    state.camera.x -= dx / state.camera.zoom;
    state.camera.y -= dy / state.camera.zoom;
    lastPan = { x: e.clientX, y: e.clientY };
    return;
  }
  if (draggingId) {
    const w = screenToWorld(e.clientX, e.clientY);
    dragDeploy(state, draggingId, w.x, w.y);
  }
});

window.addEventListener('mouseup', () => {
  draggingId = null;
  panning = false;
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    state.camera.zoom = Math.max(0.45, Math.min(1.8, state.camera.zoom * factor));
  },
  { passive: false },
);

const formKeys: Record<string, FormationKind> = {
  '1': 'line',
  '2': 'wedge',
  '3': 'square',
  '4': 'skirmish',
};

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'enter') {
    e.preventDefault();
    startBattle(state);
  } else if (k === 'p') {
    if (state.phase === 'battle') state.paused = !state.paused;
  } else if (k === 'r') {
    state = restart();
  } else if (k === 'q') {
    rotateSelected(state, -Math.PI / 12);
  } else if (k === 'e') {
    rotateSelected(state, Math.PI / 12);
  } else if (formKeys[e.key]) {
    setFormation(state, formKeys[e.key]);
  } else if (k === 'w') state.camera.y -= 40 / state.camera.zoom;
  else if (k === 's') state.camera.y += 40 / state.camera.zoom;
  else if (k === 'a') state.camera.x -= 40 / state.camera.zoom;
  else if (k === 'd') state.camera.x += 40 / state.camera.zoom;
});

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  tick(state, dt);
  // soft camera clamp
  state.camera.x = Math.max(0, Math.min(WORLD_W, state.camera.x));
  state.camera.y = Math.max(0, Math.min(WORLD_H, state.camera.y));
  render(ctx, state, window.innerWidth, window.innerHeight);
  paintHud(state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
