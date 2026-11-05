export type Faction = 'rome' | 'qin';
export type Phase = 'deploy' | 'battle' | 'ended';
export type FormationKind = 'line' | 'wedge' | 'square' | 'skirmish';
export type UnitClass =
  | 'hastati'
  | 'principes'
  | 'triarii'
  | 'velites'
  | 'equites'
  | 'bubing'
  | 'nubing'
  | 'qibing'
  | 'jiandun';

export interface Vec2 {
  x: number;
  y: number;
}

export interface UnitDef {
  id: UnitClass;
  faction: Faction;
  nameVi: string;
  nameEn: string;
  role: 'melee' | 'ranged' | 'cavalry';
  soldiers: number;
  hp: number;
  attack: number;
  defense: number;
  range: number; // pixels; 0 = melee only
  rangedAttack: number;
  speed: number;
  charge: number;
  morale: number;
  color: string;
  accent: string;
}

export interface Soldier {
  ox: number; // offset from unit center in formation local space
  oy: number;
  alive: boolean;
}

export interface Unit {
  id: string;
  defId: UnitClass;
  faction: Faction;
  x: number;
  y: number;
  facing: number; // radians
  formation: FormationKind;
  soldiers: Soldier[];
  hp: number;
  maxHp: number;
  morale: number;
  maxMorale: number;
  cohesion: number; // 0..1
  cooldown: number;
  rangedCooldown: number;
  targetId: string | null;
  velX: number;
  velY: number;
  routing: boolean;
  engaged: boolean;
  banner: string;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  faction: Faction;
  life: number;
  kind: 'pilum' | 'bolt' | 'javelin';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  kind: 'dust' | 'blood' | 'spark';
}

export interface GameState {
  phase: Phase;
  winner: Faction | null;
  units: Unit[];
  projectiles: Projectile[];
  particles: Particle[];
  selectedId: string | null;
  time: number;
  paused: boolean;
  camera: { x: number; y: number; zoom: number };
  message: string;
  playerFaction: Faction;
}

export const WORLD_W = 1600;
export const WORLD_H = 900;
export const DEPLOY_MARGIN = 280;
