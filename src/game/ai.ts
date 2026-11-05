import type { Unit, FormationKind } from './types';
import { WORLD_W, WORLD_H, DEPLOY_MARGIN } from './types';
import { createUnit, QIN_ROSTER, ROME_ROSTER, defOf } from './units';
import { dist, nearestEnemy, unitRadius, tryRanged } from './combat';
import { formationBonus } from './formations';
import type { Projectile } from './types';

export function deployQinAI(): Unit[] {
  const units: Unit[] = [];
  const roster = QIN_ROSTER;
  const startX = WORLD_W - DEPLOY_MARGIN + 40;
  const cols = 2;
  const gapY = 95;
  const gapX = 110;
  const total = roster.length;
  const rows = Math.ceil(total / cols);
  const y0 = WORLD_H / 2 - ((rows - 1) * gapY) / 2;

  roster.forEach((cls, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const def = defOf({ defId: cls } as Unit);
    let form: FormationKind = 'line';
    if (def.role === 'ranged') form = 'skirmish';
    else if (def.role === 'cavalry') form = 'wedge';
    else if (cls === 'jiandun') form = 'square';
    const x = startX - col * gapX;
    const y = y0 + row * gapY + (col === 1 ? 20 : 0);
    units.push(createUnit(cls, x, y, Math.PI, form)); // face left
  });
  return units;
}

export function defaultRomeDeploy(): Unit[] {
  const units: Unit[] = [];
  const roster = ROME_ROSTER;
  const startX = DEPLOY_MARGIN - 40;
  const cols = 2;
  const gapY = 95;
  const gapX = 110;
  const rows = Math.ceil(roster.length / cols);
  const y0 = WORLD_H / 2 - ((rows - 1) * gapY) / 2;

  roster.forEach((cls, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const def = defOf({ defId: cls } as Unit);
    let form: FormationKind = 'line';
    if (def.role === 'ranged') form = 'skirmish';
    else if (def.role === 'cavalry') form = 'wedge';
    else if (cls === 'triarii') form = 'square';
    const x = startX + col * gapX;
    const y = y0 + row * gapY + (col === 1 ? -15 : 0);
    units.push(createUnit(cls, x, y, 0, form));
  });
  return units;
}

/** Simple battle AI: advance, hold formation, flank with cavalry, shoot when in range. */
export function commandUnit(
  u: Unit,
  units: Unit[],
  projectiles: Projectile[],
  dt: number,
): { tx: number; ty: number } | null {
  if (u.routing || u.hp <= 0) {
    // flee opposite of nearest enemy
    const foe = nearestEnemy(u, units);
    if (foe) {
      const a = Math.atan2(u.y - foe.y, u.x - foe.x);
      return { tx: u.x + Math.cos(a) * 200, ty: u.y + Math.sin(a) * 200 };
    }
    return { tx: u.faction === 'rome' ? -100 : WORLD_W + 100, ty: u.y };
  }

  const def = defOf(u);
  const foe = nearestEnemy(u, units);
  if (!foe) return null;

  const d = dist(u, foe);
  const engageR = unitRadius(u) + unitRadius(foe) + 8;

  if (def.range > 0 && d <= def.range * 0.95 && d > engageR + 10) {
    tryRanged(u, foe, projectiles);
    // kiting: step back if too close
    if (d < def.range * 0.55) {
      const a = Math.atan2(u.y - foe.y, u.x - foe.x);
      return { tx: u.x + Math.cos(a) * 80, ty: u.y + Math.sin(a) * 80 };
    }
    // hold and shoot
    u.facing = Math.atan2(foe.y - u.y, foe.x - u.x);
    return { tx: u.x, ty: u.y };
  }

  if (def.role === 'cavalry') {
    // try to approach from flank / rear
    const rearX = foe.x - Math.cos(foe.facing) * 90;
    const rearY = foe.y - Math.sin(foe.facing) * 90;
    const sideX = foe.x + Math.cos(foe.facing + Math.PI / 2) * 70;
    const sideY = foe.y + Math.sin(foe.facing + Math.PI / 2) * 70;
    const preferRear = dist(u, { x: rearX, y: rearY }) < dist(u, { x: sideX, y: sideY });
    if (d > engageR + 20) {
      return preferRear ? { tx: rearX, ty: rearY } : { tx: sideX, ty: sideY };
    }
  }

  // infantry: march toward enemy front
  if (d > engageR) {
    // stagger: keep slight lateral offset by id hash so they don't stack
    const hash = u.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const lat = ((hash % 11) - 5) * 8;
    const ang = Math.atan2(foe.y - u.y, foe.x - u.x);
    return {
      tx: foe.x - Math.cos(ang) * (engageR - 5) + Math.cos(ang + Math.PI / 2) * lat,
      ty: foe.y - Math.sin(ang) * (engageR - 5) + Math.sin(ang + Math.PI / 2) * lat,
    };
  }

  void formationBonus;
  void dt;
  return { tx: foe.x, ty: foe.y };
}
