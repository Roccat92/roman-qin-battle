import type { GameState, FormationKind, Unit, Faction } from './types';
import { WORLD_W, WORLD_H, DEPLOY_MARGIN } from './types';
import { resetIds, defOf, aliveCount } from './units';
import { applyFormation, formationBonus } from './formations';
import {
  dist,
  nearestEnemy,
  unitRadius,
  resolveMelee,
  tryRanged,
  stepProjectiles,
  stepParticles,
  spawnDust,
} from './combat';
import { updateMorale, checkWinner } from './morale';
import { deployQinAI, defaultRomeDeploy, commandUnit } from './ai';

export function createInitialState(playerFaction: Faction = 'rome'): GameState {
  resetIds();
  const rome = defaultRomeDeploy();
  const qin = deployQinAI();
  return {
    phase: 'deploy',
    winner: null,
    units: [...rome, ...qin],
    projectiles: [],
    particles: [],
    selectedId: rome[0]?.id ?? null,
    time: 0,
    paused: false,
    camera: { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 0.85 },
    message: 'Đặt trận — kéo đơn vị trong vùng triển khai, Q/E xoay, 1-4 đổi đội hình, Space bắt đầu',
    playerFaction,
  };
}

export function selectedUnit(s: GameState): Unit | null {
  return s.units.find((u) => u.id === s.selectedId) ?? null;
}

export function startBattle(s: GameState): void {
  if (s.phase !== 'deploy') return;
  s.phase = 'battle';
  s.message = 'Xung trận! Click chọn · Click phải di chuyển · 1-4 đội hình · P tạm dừng';
  s.time = 0;
}

export function setFormation(s: GameState, kind: FormationKind): void {
  const u = selectedUnit(s);
  if (!u || u.faction !== s.playerFaction || u.routing) return;
  applyFormation(u, kind);
}

export function rotateSelected(s: GameState, delta: number): void {
  const u = selectedUnit(s);
  if (!u || u.faction !== s.playerFaction) return;
  if (s.phase === 'battle' && u.engaged) return;
  u.facing += delta;
}

export function moveSelectedToward(s: GameState, x: number, y: number): void {
  const u = selectedUnit(s);
  if (!u || u.faction !== s.playerFaction || u.routing || s.phase !== 'battle') return;
  (u as Unit & { _order?: { x: number; y: number } })._order = { x, y };
}

export function dragDeploy(s: GameState, id: string, x: number, y: number): void {
  if (s.phase !== 'deploy') return;
  const u = s.units.find((q) => q.id === id);
  if (!u || u.faction !== s.playerFaction) return;
  u.x = Math.max(40, Math.min(DEPLOY_MARGIN - 20, x));
  u.y = Math.max(60, Math.min(WORLD_H - 60, y));
}

function moveToward(u: Unit, tx: number, ty: number, dt: number): void {
  const def = defOf(u);
  const speedMul = formationBonus(u.formation).speedMul;
  const speed = def.speed * speedMul * (u.routing ? 1.35 : 1) * (u.cohesion < 0.4 ? 0.85 : 1);
  const dx = tx - u.x;
  const dy = ty - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) {
    u.velX = 0;
    u.velY = 0;
    return;
  }
  const ang = Math.atan2(dy, dx);
  if (!u.engaged || u.routing) u.facing = ang;
  const step = Math.min(d, speed * dt);
  u.velX = Math.cos(ang) * speed;
  u.velY = Math.sin(ang) * speed;
  u.x += Math.cos(ang) * step;
  u.y += Math.sin(ang) * step;
  u.x = Math.max(20, Math.min(WORLD_W - 20, u.x));
  u.y = Math.max(20, Math.min(WORLD_H - 20, u.y));
}

export function tick(s: GameState, dt: number): void {
  if (s.paused || s.phase !== 'battle') {
    stepParticles(s.particles, dt);
    return;
  }
  const capped = Math.min(dt, 0.05);
  s.time += capped;

  for (const u of s.units) {
    u.cooldown = Math.max(0, u.cooldown - capped);
    u.rangedCooldown = Math.max(0, u.rangedCooldown - capped);
    u.engaged = false;
  }

  for (const u of s.units) {
    if (u.hp <= 0) continue;
    const ordered = (u as Unit & { _order?: { x: number; y: number } })._order;
    let target: { tx: number; ty: number } | null = null;

    if (u.faction === s.playerFaction && ordered && !u.routing) {
      target = { tx: ordered.x, ty: ordered.y };
      if (dist(u, ordered) < 12) {
        delete (u as Unit & { _order?: unknown })._order;
        target = null;
      }
    } else if (u.faction !== s.playerFaction || u.routing) {
      target = commandUnit(u, s.units, s.projectiles, capped);
    } else {
      const foe = nearestEnemy(u, s.units);
      if (foe) {
        const def = defOf(u);
        const d = dist(u, foe);
        const er = unitRadius(u) + unitRadius(foe) + 8;
        if (def.range > 0 && d < def.range) tryRanged(u, foe, s.projectiles);
        if (d < er + 40) target = { tx: foe.x, ty: foe.y };
      }
    }

    if (target) moveToward(u, target.tx, target.ty, capped);
    else {
      u.velX *= 0.8;
      u.velY *= 0.8;
    }

    spawnDust(s.particles, u.x, u.y, Math.hypot(u.velX, u.velY));
  }

  for (let i = 0; i < s.units.length; i++) {
    const a = s.units[i];
    if (a.routing || a.hp <= 0) continue;
    for (let j = i + 1; j < s.units.length; j++) {
      const b = s.units[j];
      if (b.routing || b.hp <= 0 || a.faction === b.faction) continue;
      const er = unitRadius(a) + unitRadius(b);
      if (dist(a, b) <= er) {
        a.engaged = true;
        b.engaged = true;
        delete (a as Unit & { _order?: unknown })._order;
        delete (b as Unit & { _order?: unknown })._order;
        resolveMelee(a, b, capped, s.particles);
        resolveMelee(b, a, capped, s.particles);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const overlap = er - dist(a, b);
        if (overlap > 0) {
          a.x -= Math.cos(ang) * overlap * 0.35;
          a.y -= Math.sin(ang) * overlap * 0.35;
          b.x += Math.cos(ang) * overlap * 0.35;
          b.y += Math.sin(ang) * overlap * 0.35;
        }
      }
    }
  }

  stepProjectiles(s.projectiles, s.units, s.particles, capped);
  stepParticles(s.particles, capped);

  for (const u of s.units) {
    if (u.hp <= 0) continue;
    const allies = s.units.filter((x) => x.faction === u.faction);
    const enemies = s.units.filter((x) => x.faction !== u.faction);
    updateMorale(u, allies, enemies, capped);
    if (u.routing && Math.random() < capped * 2) {
      const living = u.soldiers.find((sol) => sol.alive);
      if (living) living.alive = false;
    }
  }

  const w = checkWinner(s.units);
  if (w) {
    s.phase = 'ended';
    s.winner = w;
    s.message =
      w === s.playerFaction
        ? 'Chiến thắng! Quân địch tan vỡ — R chơi lại'
        : 'Thất bại... Đoàn quân vỡ trận — R chơi lại';
  }
  void aliveCount;
}

export function restart(): GameState {
  return createInitialState('rome');
}
