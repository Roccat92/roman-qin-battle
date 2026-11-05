import type { GameState, Unit } from './types';
import { WORLD_W, WORLD_H, DEPLOY_MARGIN } from './types';
import { defOf, aliveCount } from './units';
import { worldSoldierPos } from './formations';
import { unitRadius } from './combat';
import { drawSoldierSprite, animForUnit, preloadAllSprites } from './sprites';

let spritesReady = false;

export function ensureSprites(): void {
  if (spritesReady) return;
  if (typeof document === 'undefined') return;
  preloadAllSprites();
  spritesReady = true;
}

function roundRect(
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
}

export function render(ctx: CanvasRenderingContext2D, s: GameState, w: number, h: number): void {
  ensureSprites();
  const cam = s.camera;
  ctx.clearRect(0, 0, w, h);

  // sandy-beige field like the reference indie formation game
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#c4b896');
  g.addColorStop(0.5, '#d2c4a0');
  g.addColorStop(1, '#b8a87e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  drawField(ctx, s);

  for (const p of s.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const p of s.projectiles) {
    ctx.strokeStyle = p.kind === 'bolt' ? '#222' : '#5c3317';
    ctx.lineWidth = p.kind === 'bolt' ? 1.5 : 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
    ctx.stroke();
  }

  const sorted = [...s.units].sort((a, b) => a.y - b.y);
  for (const u of sorted) drawUnit(ctx, u, u.id === s.selectedId, s.time);

  ctx.restore();
}

function drawField(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.strokeStyle = 'rgba(80,60,30,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(60,40,20,0.3)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

  if (s.phase === 'deploy') {
    ctx.fillStyle = 'rgba(40,80,180,0.1)';
    ctx.fillRect(0, 0, DEPLOY_MARGIN, WORLD_H);
    ctx.fillStyle = 'rgba(40,40,40,0.1)';
    ctx.fillRect(WORLD_W - DEPLOY_MARGIN, 0, DEPLOY_MARGIN, WORLD_H);
    ctx.fillStyle = 'rgba(40,30,10,0.75)';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText('VÙNG TRIỂN KHAI LA MÃ', 36, 36);
    ctx.fillText('QUÂN TẦN (AI)', WORLD_W - DEPLOY_MARGIN + 36, 36);
  }

  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = 'rgba(60,40,20,0.2)';
  ctx.beginPath();
  ctx.moveTo(WORLD_W / 2, 20);
  ctx.lineTo(WORLD_W / 2, WORLD_H - 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawUnit(ctx: CanvasRenderingContext2D, u: Unit, selected: boolean, time: number): void {
  const def = defOf(u);
  const alpha = u.routing ? 0.5 : 1;
  const anim = animForUnit(u);

  if (selected) {
    ctx.strokeStyle = '#ffc629';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + 4, unitRadius(u) + 8, (unitRadius(u) + 8) * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // facing tick (small, not a huge wedge)
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  const tip = unitRadius(u) * 0.4 + 10;
  ctx.beginPath();
  ctx.moveTo(u.x + Math.cos(u.facing) * tip, u.y + Math.sin(u.facing) * tip);
  ctx.lineTo(u.x + Math.cos(u.facing + 2.5) * 6, u.y + Math.sin(u.facing + 2.5) * 6);
  ctx.lineTo(u.x + Math.cos(u.facing - 2.5) * 6, u.y + Math.sin(u.facing - 2.5) * 6);
  ctx.closePath();
  ctx.fill();

  // soldiers back-to-front for overlap
  const sols = u.soldiers
    .map((sol, i) => ({ sol, i }))
    .filter((x) => x.sol.alive)
    .map((x) => {
      const p = worldSoldierPos(u, x.sol.ox, x.sol.oy);
      return { ...p, i: x.i };
    })
    .sort((a, b) => a.y - b.y);

  for (const p of sols) {
    drawSoldierSprite(ctx, u.defId, p.x, p.y, u.facing, anim, time + p.i * 0.07, alpha);
  }

  // banner
  const bx = u.x - Math.cos(u.facing) * 16;
  const by = u.y - Math.sin(u.facing) * 16 - 28;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = def.faction === 'rome' ? '#8b1e1e' : '#111111';
  ctx.fillRect(bx - 1, by, 3, 26);
  ctx.fillStyle = def.faction === 'rome' ? '#f5e6c8' : '#c9a227';
  roundRect(ctx, bx + 2, by, 30, 14, 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 9px system-ui';
  ctx.fillText(u.banner, bx + 5, by + 10);

  // bars
  const barW = 48;
  const hx = u.x - barW / 2;
  const hy = u.y + unitRadius(u) + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(hx, hy, barW, 4);
  ctx.fillStyle = u.hp / u.maxHp > 0.35 ? '#3ddc84' : '#e74c3c';
  ctx.fillRect(hx, hy, barW * (u.hp / u.maxHp), 4);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(hx, hy + 5, barW, 3);
  ctx.fillStyle = '#6ea8fe';
  ctx.fillRect(hx, hy + 5, barW * (u.morale / u.maxMorale), 3);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(hx, hy + 9, barW, 3);
  ctx.fillStyle = '#ffc629';
  ctx.fillRect(hx, hy + 9, barW * u.cohesion, 3);

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.font = 'bold 10px system-ui';
  ctx.fillText(`${def.nameVi} · ${formLabel(u.formation)}`, hx, hy - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '9px system-ui';
  const count = `${aliveCount(u)}/${u.soldiers.length}`;
  ctx.fillText(count, hx + barW - ctx.measureText(count).width, hy - 4);

  if (u.routing) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('RÚT LUI!', u.x - 22, u.y - unitRadius(u) - 14);
  }

  ctx.globalAlpha = 1;
}

function formLabel(f: string): string {
  switch (f) {
    case 'line':
      return 'Hàng ngang';
    case 'wedge':
      return 'Hình nêm';
    case 'square':
      return 'Vuông/Testudo';
    case 'skirmish':
      return 'Phóng kỳ';
    default:
      return f;
  }
}
