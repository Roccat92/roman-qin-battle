import type { UnitClass, UnitDef, Faction, Unit, FormationKind, Soldier } from './types';
import { layoutFormation } from './formations';

export const UNIT_DEFS: Record<UnitClass, UnitDef> = {
  hastati: {
    id: 'hastati',
    faction: 'rome',
    nameVi: 'Hastati',
    nameEn: 'Hastati',
    role: 'melee',
    soldiers: 36,
    hp: 100,
    attack: 14,
    defense: 10,
    range: 90,
    rangedAttack: 8,
    speed: 55,
    charge: 1.15,
    morale: 70,
    color: '#c45c26',
    accent: '#f0d5a8',
  },
  principes: {
    id: 'principes',
    faction: 'rome',
    nameVi: 'Principes',
    nameEn: 'Principes',
    role: 'melee',
    soldiers: 36,
    hp: 120,
    attack: 16,
    defense: 14,
    range: 70,
    rangedAttack: 6,
    speed: 48,
    charge: 1.2,
    morale: 85,
    color: '#8b1e1e',
    accent: '#e8c070',
  },
  triarii: {
    id: 'triarii',
    faction: 'rome',
    nameVi: 'Triarii',
    nameEn: 'Triarii',
    role: 'melee',
    soldiers: 28,
    hp: 140,
    attack: 18,
    defense: 18,
    range: 0,
    rangedAttack: 0,
    speed: 42,
    charge: 1.1,
    morale: 100,
    color: '#4a0e0e',
    accent: '#d4af37',
  },
  velites: {
    id: 'velites',
    faction: 'rome',
    nameVi: 'Velites',
    nameEn: 'Velites',
    role: 'ranged',
    soldiers: 24,
    hp: 60,
    attack: 6,
    defense: 4,
    range: 180,
    rangedAttack: 11,
    speed: 70,
    charge: 0.9,
    morale: 55,
    color: '#d4a017',
    accent: '#fff3c4',
  },
  equites: {
    id: 'equites',
    faction: 'rome',
    nameVi: 'Equites',
    nameEn: 'Equites',
    role: 'cavalry',
    soldiers: 16,
    hp: 90,
    attack: 15,
    defense: 8,
    range: 0,
    rangedAttack: 0,
    speed: 110,
    charge: 1.55,
    morale: 75,
    color: '#2c5aa0',
    accent: '#c0d4f0',
  },
  bubing: {
    id: 'bubing',
    faction: 'qin',
    nameVi: 'Bộ binh Tần',
    nameEn: 'Qin Infantry',
    role: 'melee',
    soldiers: 40,
    hp: 105,
    attack: 13,
    defense: 11,
    range: 0,
    rangedAttack: 0,
    speed: 52,
    charge: 1.1,
    morale: 75,
    color: '#1a5c38',
    accent: '#b8e0c8',
  },
  jiandun: {
    id: 'jiandun',
    faction: 'qin',
    nameVi: 'Khiên kích',
    nameEn: 'Shield Spear',
    role: 'melee',
    soldiers: 36,
    hp: 125,
    attack: 15,
    defense: 16,
    range: 0,
    rangedAttack: 0,
    speed: 45,
    charge: 1.05,
    morale: 90,
    color: '#0d3d28',
    accent: '#8fd4a8',
  },
  nubing: {
    id: 'nubing',
    faction: 'qin',
    nameVi: 'Nỏ binh',
    nameEn: 'Crossbowmen',
    role: 'ranged',
    soldiers: 28,
    hp: 55,
    attack: 5,
    defense: 3,
    range: 220,
    rangedAttack: 14,
    speed: 50,
    charge: 0.85,
    morale: 60,
    color: '#3d6b4f',
    accent: '#d0e8d8',
  },
  qibing: {
    id: 'qibing',
    faction: 'qin',
    nameVi: 'Kỵ binh Tần',
    nameEn: 'Qin Cavalry',
    role: 'cavalry',
    soldiers: 16,
    hp: 85,
    attack: 14,
    defense: 7,
    range: 0,
    rangedAttack: 0,
    speed: 115,
    charge: 1.5,
    morale: 70,
    color: '#145a32',
    accent: '#f0e6a0',
  },
};

export const ROME_ROSTER: UnitClass[] = [
  'velites',
  'hastati',
  'hastati',
  'principes',
  'principes',
  'triarii',
  'equites',
  'equites',
];

export const QIN_ROSTER: UnitClass[] = [
  'nubing',
  'nubing',
  'bubing',
  'bubing',
  'jiandun',
  'jiandun',
  'qibing',
  'qibing',
];

let _uid = 0;
export function nextId(prefix: string): string {
  _uid += 1;
  return `${prefix}-${_uid}`;
}

export function resetIds(): void {
  _uid = 0;
}

export function createUnit(
  defId: UnitClass,
  x: number,
  y: number,
  facing: number,
  formation: FormationKind,
  banner?: string,
): Unit {
  const def = UNIT_DEFS[defId];
  const offsets = layoutFormation(formation, def.soldiers, def.role);
  const soldiers: Soldier[] = offsets.map((o) => ({
    ox: o.x,
    oy: o.y,
    alive: true,
  }));
  return {
    id: nextId(def.faction),
    defId,
    faction: def.faction,
    x,
    y,
    facing,
    formation,
    soldiers,
    hp: def.hp,
    maxHp: def.hp,
    morale: def.morale,
    maxMorale: def.morale,
    cohesion: 1,
    cooldown: 0,
    rangedCooldown: 0,
    targetId: null,
    velX: 0,
    velY: 0,
    routing: false,
    engaged: false,
    banner: banner ?? (def.faction === 'rome' ? 'SPQR' : '秦'),
  };
}

export function defOf(u: Unit): UnitDef {
  return UNIT_DEFS[u.defId];
}

export function aliveCount(u: Unit): number {
  return u.soldiers.filter((s) => s.alive).length;
}

export function factionUnits(units: Unit[], f: Faction): Unit[] {
  return units.filter((u) => u.faction === f && !u.routing && u.hp > 0);
}
