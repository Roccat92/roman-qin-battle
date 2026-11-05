import type { GameState, Unit } from './types';
import { WORLD_W, WORLD_H, DEPLOY_MARGIN } from './types';
import { defOf, aliveCount } from './units';
import { worldSoldierPos, formationBonus } from './formations';
import { unitRadius } from './combat';

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
  const cam = s.camera;
  ctx.clearRect(0, 0, w, h);

  // backdrop
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#6a8f4e');
  g.addColorStop(0.45, '#8aab5c');
  g.addColorStop(1, '#5c7a40');
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

  // draw enemy first then player for selection clarity
  const sorted = [...s.units].sort((a, b) => a.y - b.y);
  for (const u of sorted) drawUnit(ctx, u, u.id === s.selectedId);

  ctx.restore();
}

function drawField(ctx: CanvasRenderingContext2D, s: GameState): void {
  // subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
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

  // battlefield bounds
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

  if (s.phase === 'deploy') {
    ctx.fillStyle = 'rgba(40,80,180,0.12)';
    ctx.fillRect(0, 0, DEPLOY_MARGIN, WORLD_H);
    ctx.fillStyle = 'rgba(180,40,40,0.1)';
    ctx.fillRect(WORLD_W - DEPLOY_MARGIN, 0, DEPLOY_MARGIN, WORLD_H);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText('VÙNG TRIỂN KHAI LA MÃ', 36, 36);
    ctx.fillText('QUÂN TẦN (AI)', WORLD_W - DEPLOY_MARGIN + 36, 36);
  }

  // center line
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(WORLD_W / 2, 20);
  ctx.lineTo(WORLD_W / 2, WORLD_H - 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawUnit(ctx: CanvasRenderingContext2D, u: Unit, selected: boolean): void {
  const def = defOf(u);
  const alpha = u.routing ? 0.45 : 1;
  ctx.globalAlpha = alpha;

  if (selected) {
    ctx.strokeStyle = '#ffc629';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(u.x, u.y, unitRadius(u) + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // facing wedge
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  const tip = unitRadius(u) * 0.55 + 8;
  ctx.moveTo(u.x + Math.cos(u.facing) * tip, u.y + Math.sin(u.facing) * tip);
  ctx.lineTo(
    u.x + Math.cos(u.facing + 2.4) * 8,
    u.y + Math.sin(u.facing + 2.4) * 8,
  );
  ctx.lineTo(
    u.x + Math.cos(u.facing - 2.4) * 8,
    u.y + Math.sin(u.facing - 2.4) * 8,
  );
  ctx.closePath();
  ctx.fill();

  const size = def.role === 'cavalry' ? 5.5 : 4;
  for (const sol of u.soldiers) {
    if (!sol.alive) continue;
    const p = worldSoldierPos(u, sol.ox, sol.oy);
    // shield / body
    ctx.fillStyle = def.color;
    ctx.beginPath();
    if (def.role === 'cavalry') {
      ctx.ellipse(p.x, p.y, size * 1.4, size * 0.9, u.facing, 0, Math.PI * 2);
    } else {
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = def.accent;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(u.facing) * 1.5, p.y + Math.sin(u.facing) * 1.5, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // banner
  const bx = u.x - Math.cos(u.facing) * 18;
  const by = u.y - Math.sin(u.facing) * 18 - 18;
  ctx.fillStyle = def.faction === 'rome' ? '#8b1e1e' : '#0d3d28';
  ctx.fillRect(bx - 1, by, 3, 22);
  ctx.fillStyle = def.accent;
  roundRect(ctx, bx + 2, by, 28, 14, 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 9px system-ui';
  ctx.fillText(u.banner, bx + 5, by + 10);

  // bars
  const barW = 44;
  const hx = u.x - barW / 2;
  const hy = u.y + unitRadius(u) + 8;
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

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.font = 'bold 10px system-ui';
  ctx.fillText(`${def.nameVi} · ${formLabel(u.formation)}`, hx, hy - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '9px system-ui';
  ctx.fillText(`${aliveCount(u)}/${u.soldiers.length}`, hx + barW - 2, hy - 4);

  if (u.routing) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('RÚT LUI!', u.x - 22, u.y - unitRadius(u) - 8);
  }

  ctx.globalAlpha = 1;
  void formationBonus;
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
