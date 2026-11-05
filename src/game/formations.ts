import type { FormationKind, Vec2, Unit } from './types';
import { defOf, aliveCount } from './units';

const SPACING: Record<FormationKind, number> = {
  line: 14,
  wedge: 13,
  square: 12,
  skirmish: 22,
};

/** Local-space soldier offsets relative to unit center. Facing is +X locally. */
export function layoutFormation(
  kind: FormationKind,
  count: number,
  role: 'melee' | 'ranged' | 'cavalry',
): Vec2[] {
  const s = SPACING[kind] * (role === 'cavalry' ? 1.35 : 1);
  const out: Vec2[] = [];
  if (count <= 0) return out;

  if (kind === 'line') {
    const ranks = role === 'ranged' ? 2 : 3;
    const perRank = Math.ceil(count / ranks);
    let i = 0;
    for (let r = 0; r < ranks && i < count; r++) {
      const n = Math.min(perRank, count - i);
      for (let c = 0; c < n; c++) {
        out.push({
          x: -r * s,
          y: (c - (n - 1) / 2) * s,
        });
        i++;
      }
    }
  } else if (kind === 'wedge') {
    let i = 0;
    let rank = 0;
    while (i < count) {
      const n = Math.min(rank + 1, count - i);
      for (let c = 0; c < n; c++) {
        out.push({
          x: -rank * s * 0.9,
          y: (c - (n - 1) / 2) * s,
        });
        i++;
      }
      rank++;
    }
  } else if (kind === 'square') {
    // testudo / dense block
    const side = Math.ceil(Math.sqrt(count));
    let i = 0;
    for (let r = 0; r < side && i < count; r++) {
      for (let c = 0; c < side && i < count; c++) {
        out.push({
          x: (side / 2 - 0.5 - r) * s * 0.85,
          y: (c - (side - 1) / 2) * s * 0.85,
        });
        i++;
      }
    }
  } else {
    // skirmish loose cloud
    const cols = Math.ceil(Math.sqrt(count * 1.6));
    const rows = Math.ceil(count / cols);
    let i = 0;
    for (let r = 0; r < rows && i < count; r++) {
      const n = Math.min(cols, count - i);
      for (let c = 0; c < n; c++) {
        const jitter = ((i * 17) % 7) - 3;
        out.push({
          x: -r * s + jitter,
          y: (c - (n - 1) / 2) * s + (((i * 13) % 5) - 2),
        });
        i++;
      }
    }
  }
  return out;
}

export interface FormationBonus {
  frontage: number; // effective combat width multiplier
  cohesionHold: number; // how well formation resists break
  defenseMul: number;
  attackMul: number;
  speedMul: number;
  rangedMul: number;
  flankResist: number;
}

export function formationBonus(kind: FormationKind): FormationBonus {
  switch (kind) {
    case 'line':
      return {
        frontage: 1.25,
        cohesionHold: 1.0,
        defenseMul: 1.0,
        attackMul: 1.1,
        speedMul: 1.0,
        rangedMul: 1.05,
        flankResist: 0.7,
      };
    case 'wedge':
      return {
        frontage: 0.75,
        cohesionHold: 0.85,
        defenseMul: 0.9,
        attackMul: 1.35,
        speedMul: 1.1,
        rangedMul: 0.8,
        flankResist: 0.55,
      };
    case 'square':
      return {
        frontage: 0.85,
        cohesionHold: 1.35,
        defenseMul: 1.4,
        attackMul: 0.85,
        speedMul: 0.7,
        rangedMul: 0.6,
        flankResist: 1.25,
      };
    case 'skirmish':
      return {
        frontage: 1.1,
        cohesionHold: 0.55,
        defenseMul: 0.7,
        attackMul: 0.75,
        speedMul: 1.25,
        rangedMul: 1.3,
        flankResist: 0.9,
      };
  }
}

/** Re-pack living soldiers into current formation. */
export function reformUnit(u: Unit): void {
  const def = defOf(u);
  const living = aliveCount(u);
  const offsets = layoutFormation(u.formation, living, def.role);
  let oi = 0;
  for (const s of u.soldiers) {
    if (!s.alive) continue;
    const o = offsets[oi++];
    if (o) {
      s.ox = o.x;
      s.oy = o.y;
    }
  }
  // cohesion recovers slightly when reforming
  u.cohesion = Math.min(1, u.cohesion + 0.15);
}

export function applyFormation(u: Unit, kind: FormationKind): void {
  u.formation = kind;
  reformUnit(u);
}

/** Combat power scale from cohesion (broken formation hurts a lot). */
export function cohesionPower(u: Unit): number {
  const c = u.cohesion;
  if (c >= 0.75) return 0.85 + c * 0.2;
  if (c >= 0.4) return 0.55 + c * 0.5;
  return 0.25 + c * 0.5;
}

export function worldSoldierPos(u: Unit, ox: number, oy: number): Vec2 {
  const c = Math.cos(u.facing);
  const s = Math.sin(u.facing);
  return {
    x: u.x + ox * c - oy * s,
    y: u.y + ox * s + oy * c,
  };
}
