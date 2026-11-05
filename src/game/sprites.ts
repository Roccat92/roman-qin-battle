import type { UnitClass, Unit } from './types';
import { defOf } from './units';

/** Frame states baked into the spritesheet. */
export type AnimState = 'idle' | 'walk' | 'attack';

export const SPRITE_W = 28;
export const SPRITE_H = 34;
export const CAV_W = 40;
export const CAV_H = 34;

const DIRS = 4; // 0 E, 1 S, 2 W, 3 N
const STATES: AnimState[] = ['idle', 'walk', 'attack'];

interface Palette {
  tunic: string;
  armor: string;
  helm: string;
  plume: string;
  skin: string;
  shield: string;
  shieldBoss: string;
  weapon: string;
  pants: string;
  horse: string;
  horseMane: string;
}

function paletteFor(cls: UnitClass): Palette {
  const skin = '#d4a574';
  switch (cls) {
    case 'velites':
      return {
        tunic: '#e8c84a',
        armor: '#c4a35a',
        helm: '#8a7350',
        plume: '#f5e6a0',
        skin,
        shield: '#c62828',
        shieldBoss: '#ffd54f',
        weapon: '#6d4c41',
        pants: '#5d4037',
        horse: '#5d4037',
        horseMane: '#3e2723',
      };
    case 'hastati':
      return {
        tunic: '#ffffff',
        armor: '#b0bec5',
        helm: '#90a4ae',
        plume: '#c62828',
        skin,
        shield: '#b71c1c',
        shieldBoss: '#ffc107',
        weapon: '#78909c',
        pants: '#5d4037',
        horse: '#5d4037',
        horseMane: '#3e2723',
      };
    case 'principes':
      return {
        tunic: '#eceff1',
        armor: '#78909c',
        helm: '#607d8b',
        plume: '#b71c1c',
        skin,
        shield: '#8b0000',
        shieldBoss: '#ffd54f',
        weapon: '#546e7a',
        pants: '#4e342e',
        horse: '#5d4037',
        horseMane: '#3e2723',
      };
    case 'triarii':
      return {
        tunic: '#cfd8dc',
        armor: '#546e7a',
        helm: '#37474f',
        plume: '#d4af37',
        skin,
        shield: '#7f0000',
        shieldBoss: '#ffecb3',
        weapon: '#455a64',
        pants: '#3e2723',
        horse: '#5d4037',
        horseMane: '#3e2723',
      };
    case 'equites':
      return {
        tunic: '#e3f2fd',
        armor: '#90a4ae',
        helm: '#607d8b',
        plume: '#1565c0',
        skin,
        shield: '#c62828',
        shieldBoss: '#fff59d',
        weapon: '#546e7a',
        pants: '#4e342e',
        horse: '#6d4c41',
        horseMane: '#3e2723',
      };
    case 'nubing':
      return {
        tunic: '#2e7d32',
        armor: '#111111',
        helm: '#1a1a1a',
        plume: '#c9a227',
        skin,
        shield: '#1b1b1b',
        shieldBoss: '#b8860b',
        weapon: '#3e2723',
        pants: '#1b5e20',
        horse: '#3e2723',
        horseMane: '#212121',
      };
    case 'bubing':
      return {
        tunic: '#1b5e20',
        armor: '#0d0d0d',
        helm: '#111111',
        plume: '#8d6e63',
        skin,
        shield: '#151515',
        shieldBoss: '#a1887f',
        weapon: '#5d4037',
        pants: '#0d3d28',
        horse: '#3e2723',
        horseMane: '#212121',
      };
    case 'jiandun':
      return {
        tunic: '#0d3d28',
        armor: '#000000',
        helm: '#0a0a0a',
        plume: '#c9a227',
        skin,
        shield: '#0a0a0a',
        shieldBoss: '#d4af37',
        weapon: '#4e342e',
        pants: '#022c16',
        horse: '#3e2723',
        horseMane: '#212121',
      };
    case 'qibing':
      return {
        tunic: '#145a32',
        armor: '#0a0a0a',
        helm: '#111111',
        plume: '#f0e6a0',
        skin,
        shield: '#101010',
        shieldBoss: '#c9a227',
        weapon: '#5d4037',
        pants: '#0d3d28',
        horse: '#212121',
        horseMane: '#000000',
      };
  }
}

type WeaponKind = 'gladius' | 'pilum' | 'hasta' | 'javelin' | 'crossbow' | 'spear' | 'halberd' | 'lance';

function weaponFor(cls: UnitClass): WeaponKind {
  switch (cls) {
    case 'velites':
      return 'javelin';
    case 'hastati':
      return 'pilum';
    case 'principes':
      return 'gladius';
    case 'triarii':
      return 'hasta';
    case 'equites':
      return 'lance';
    case 'nubing':
      return 'crossbow';
    case 'bubing':
      return 'spear';
    case 'jiandun':
      return 'halberd';
    case 'qibing':
      return 'lance';
  }
}

function shieldStyle(cls: UnitClass): 'scutum' | 'round' | 'buckler' | 'none' {
  if (cls === 'velites' || cls === 'nubing') return 'buckler';
  if (cls === 'equites' || cls === 'qibing') return 'round';
  if (cls === 'bubing' || cls === 'jiandun') return 'round';
  return 'scutum'; // roman infantry
}

interface Sheet {
  canvas: HTMLCanvasElement;
  fw: number;
  fh: number;
  isCav: boolean;
}

const cache = new Map<UnitClass, Sheet>();

function ensureSheet(cls: UnitClass): Sheet {
  const hit = cache.get(cls);
  if (hit) return hit;
  const def = defOf({ defId: cls } as Unit);
  const isCav = def.role === 'cavalry';
  const fw = isCav ? CAV_W : SPRITE_W;
  const fh = isCav ? CAV_H : SPRITE_H;
  const canvas = document.createElement('canvas');
  canvas.width = fw * DIRS;
  canvas.height = fh * STATES.length;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const pal = paletteFor(cls);
  const wpn = weaponFor(cls);
  const sh = shieldStyle(cls);

  for (let si = 0; si < STATES.length; si++) {
    for (let d = 0; d < DIRS; d++) {
      ctx.save();
      ctx.translate(d * fw + fw / 2, si * fh + fh - 2);
      drawFigure(ctx, {
        dir: d,
        state: STATES[si],
        pal,
        weapon: wpn,
        shield: sh,
        isCav,
        elite: cls === 'triarii' || cls === 'jiandun' || cls === 'principes',
      });
      ctx.restore();
    }
  }

  const sheet: Sheet = { canvas, fw, fh, isCav };
  cache.set(cls, sheet);
  return sheet;
}

interface DrawOpts {
  dir: number;
  state: AnimState;
  pal: Palette;
  weapon: WeaponKind;
  shield: 'scutum' | 'round' | 'buckler' | 'none';
  isCav: boolean;
  elite: boolean;
}

/** Draw one isometric-ish human (origin at feet). */
function drawFigure(ctx: CanvasRenderingContext2D, o: DrawOpts): void {
  const faceLeft = o.dir === 2;
  const faceUp = o.dir === 3;
  const faceDown = o.dir === 1;
  const sx = faceLeft ? -1 : 1;
  const bob = o.state === 'walk' ? 1 : 0;
  const stride = o.state === 'walk' ? 2.2 : 0;
  const thrust = o.state === 'attack' ? 4 : 0;
  const crouch = o.state === 'attack' ? 1 : 0;

  ctx.save();
  ctx.scale(sx, 1);

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, o.isCav ? 12 : 7, o.isCav ? 4.5 : 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (o.isCav) {
    drawHorse(ctx, o.pal, bob, stride);
  }

  const bodyY = o.isCav ? -14 : -2 - bob - crouch;
  const legBase = o.isCav ? -10 : 0;

  if (!o.isCav) {
    // legs
    ctx.fillStyle = o.pal.pants;
    ctx.fillRect(-3.5 - stride * 0.3, legBase - 7, 3, 7 + bob);
    ctx.fillRect(0.5 + stride * 0.3, legBase - 7, 3, 7 - bob * 0.5);
    // boots
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-3.8 - stride * 0.3, legBase - 1, 3.4, 2);
    ctx.fillRect(0.3 + stride * 0.3, legBase - 1, 3.4, 2);
  }

  // torso (slight isometric diamond feel)
  ctx.fillStyle = o.pal.armor;
  roundBody(ctx, -5, bodyY - 14, 10, 12, 2);
  // tunic underlayer peek
  ctx.fillStyle = o.pal.tunic;
  ctx.fillRect(-4, bodyY - 5, 8, 4);

  // belt
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(-5, bodyY - 5.5, 10, 1.5);

  // shield (drawn behind arm for facing away, in front otherwise)
  const shieldBehind = faceUp;
  if (shieldBehind) drawShield(ctx, o, bodyY, thrust);

  // weapon arm
  drawWeapon(ctx, o, bodyY, thrust, faceDown);

  if (!shieldBehind) drawShield(ctx, o, bodyY, thrust);

  // head
  const headY = bodyY - 17;
  ctx.fillStyle = o.pal.skin;
  ctx.beginPath();
  ctx.arc(0, headY, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // helmet
  ctx.fillStyle = o.pal.helm;
  ctx.beginPath();
  ctx.arc(0, headY - 0.5, 3.6, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-3.6, headY - 1, 7.2, 2.5);
  // cheek guards
  ctx.fillRect(-3.8, headY, 1.4, 2.5);
  ctx.fillRect(2.4, headY, 1.4, 2.5);

  // plume
  if (o.elite || o.pal.plume) {
    ctx.fillStyle = o.pal.plume;
    ctx.beginPath();
    ctx.moveTo(-1, headY - 4);
    ctx.quadraticCurveTo(0, headY - 10 - (o.state === 'walk' ? 1 : 0), 2.5, headY - 5);
    ctx.quadraticCurveTo(0.5, headY - 6, -1, headY - 4);
    ctx.fill();
  }

  // nose hint facing
  if (!faceUp) {
    ctx.fillStyle = '#c49a6c';
    ctx.fillRect(sx > 0 ? 1.5 : -2.5, headY - 0.5, 1.2, 1.2);
  }

  ctx.restore();
}

function roundBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawHorse(ctx: CanvasRenderingContext2D, pal: Palette, bob: number, stride: number): void {
  ctx.fillStyle = pal.horse;
  // body
  ctx.beginPath();
  ctx.ellipse(1, -8 + bob * 0.3, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // neck + head
  ctx.beginPath();
  ctx.ellipse(12, -13, 4, 3.2, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.horseMane;
  ctx.fillRect(10, -17, 5, 2);
  // legs
  ctx.fillStyle = pal.horse;
  const s = stride;
  ctx.fillRect(-8 - s, -4, 2.2, 5);
  ctx.fillRect(-3 + s * 0.5, -4, 2.2, 5);
  ctx.fillRect(3 - s * 0.5, -4, 2.2, 5);
  ctx.fillRect(8 + s, -4, 2.2, 5);
  // saddle
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(-3, -12, 8, 3);
}

function drawShield(ctx: CanvasRenderingContext2D, o: DrawOpts, bodyY: number, thrust: number): void {
  if (o.shield === 'none') return;
  const x = -7.5;
  const y = bodyY - 12;
  ctx.fillStyle = o.pal.shield;
  if (o.shield === 'scutum') {
    // tall curved Roman shield
    roundBody(ctx, x - 2, y - 2, 7, 14, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // yellow blazon line
    ctx.strokeStyle = o.pal.shieldBoss;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, y);
    ctx.lineTo(x + 1.5, y + 10);
    ctx.stroke();
    ctx.fillStyle = o.pal.shieldBoss;
    ctx.beginPath();
    ctx.arc(x + 1.5, y + 5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.shield === 'round') {
    ctx.beginPath();
    ctx.arc(x + 1, y + 5, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = o.pal.shieldBoss;
    ctx.beginPath();
    ctx.arc(x + 1, y + 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // buckler
    ctx.beginPath();
    ctx.arc(x + 2, y + 6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = o.pal.shieldBoss;
    ctx.beginPath();
    ctx.arc(x + 2, y + 6, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  void thrust;
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  o: DrawOpts,
  bodyY: number,
  thrust: number,
  faceDown: boolean,
): void {
  const pal = o.pal;
  ctx.strokeStyle = pal.weapon;
  ctx.fillStyle = pal.weapon;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';

  const ax = 4 + thrust * 0.4;
  const ay = bodyY - 10;

  if (o.weapon === 'crossbow') {
    ctx.strokeStyle = '#3e2723';
    ctx.beginPath();
    ctx.moveTo(ax - 1, ay);
    ctx.lineTo(ax + 8 + thrust, ay - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax + 7 + thrust, ay - 5);
    ctx.lineTo(ax + 7 + thrust, ay + 4);
    ctx.stroke();
    return;
  }

  if (o.weapon === 'gladius') {
    ctx.fillRect(ax, ay - 1, 7 + thrust, 2);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(ax + 6 + thrust, ay - 1.4, 3, 2.8);
    return;
  }

  // polearms / spears / pilum / hasta / javelin / lance / halberd — upright-forward
  const len =
    o.weapon === 'hasta' || o.weapon === 'halberd'
      ? 18
      : o.weapon === 'lance'
        ? 16
        : o.weapon === 'javelin'
          ? 12
          : 14;
  const tipX = ax + 2 + thrust + (faceDown ? 1 : 3);
  const tipY = ay - len + (o.state === 'attack' ? 2 : 0);
  ctx.beginPath();
  ctx.moveTo(ax, ay + 2);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // spearhead
  ctx.fillStyle = '#b0bec5';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY - 2);
  ctx.lineTo(tipX + 2, tipY + 3);
  ctx.lineTo(tipX - 2, tipY + 3);
  ctx.closePath();
  ctx.fill();
  if (o.weapon === 'halberd') {
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(tipX - 4, tipY + 4, 6, 2);
  }
}

export function facingDir(facing: number): number {
  // 0 E, 1 S, 2 W, 3 N
  let a = facing;
  while (a < 0) a += Math.PI * 2;
  while (a >= Math.PI * 2) a -= Math.PI * 2;
  const q = Math.round(a / (Math.PI / 2)) % 4;
  return q;
}

export function animForUnit(u: Unit): AnimState {
  if (u.routing) return 'walk';
  if (u.engaged) return 'attack';
  const spd = Math.hypot(u.velX, u.velY);
  if (spd > 12) return 'walk';
  return 'idle';
}

export function drawSoldierSprite(
  ctx: CanvasRenderingContext2D,
  cls: UnitClass,
  x: number,
  y: number,
  facing: number,
  anim: AnimState,
  time: number,
  alpha = 1,
): void {
  const sheet = ensureSheet(cls);
  const dir = facingDir(facing);
  let si = STATES.indexOf(anim);
  if (si < 0) si = 0;
  // walk cycles between idle/walk frames visually via time bob already baked;
  // attack flickers walk/attack for cheap dual-frame feel
  if (anim === 'walk' && Math.floor(time * 8) % 2 === 0) {
    // keep walk
  } else if (anim === 'attack' && Math.floor(time * 10) % 2 === 0) {
    si = STATES.indexOf('idle');
  }

  const sx = dir * sheet.fw;
  const sy = si * sheet.fh;
  ctx.save();
  ctx.globalAlpha = alpha;
  const scale = sheet.isCav ? 1.25 : 1.4;
  const dw = sheet.fw * scale;
  const dh = sheet.fh * scale;
  ctx.drawImage(
    sheet.canvas,
    sx,
    sy,
    sheet.fw,
    sheet.fh,
    Math.round(x - dw / 2),
    Math.round(y - dh + 2),
    dw,
    dh,
  );
  ctx.restore();
}

/** Warm up all sheets (call once after DOM ready). */
export function preloadAllSprites(): void {
  const all: UnitClass[] = [
    'velites',
    'hastati',
    'principes',
    'triarii',
    'equites',
    'nubing',
    'bubing',
    'jiandun',
    'qibing',
  ];
  for (const c of all) ensureSheet(c);
}

export function _resetSpriteCacheForTests(): void {
  cache.clear();
}
