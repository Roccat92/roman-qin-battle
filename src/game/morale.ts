import type { Unit, Faction } from './types';
import { aliveCount, defOf, factionUnits } from './units';
import { formationBonus } from './formations';

export function updateMorale(u: Unit, allies: Unit[], enemies: Unit[], dt: number): void {
  if (u.hp <= 0) {
    u.routing = true;
    return;
  }
  const def = defOf(u);
  const bon = formationBonus(u.formation);
  const loss = 1 - u.hp / u.maxHp;
  const coh = u.cohesion;

  // nearby friends / foes
  let friendNear = 0;
  let foeNear = 0;
  let flanked = 0;
  for (const a of allies) {
    if (a.id === u.id || a.routing) continue;
    const d = Math.hypot(a.x - u.x, a.y - u.y);
    if (d < 160) friendNear++;
  }
  for (const e of enemies) {
    if (e.routing || e.hp <= 0) continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y);
    if (d < 120) {
      foeNear++;
      const ang = Math.atan2(e.y - u.y, e.x - u.x) - u.facing;
      const aa = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
      if (aa > Math.PI * 0.55) flanked++;
    }
  }

  let delta = 0;
  delta -= loss * 12 * dt;
  delta -= (1 - coh) * 8 * dt;
  delta -= flanked * 6 * dt;
  delta += friendNear * 1.5 * dt;
  delta -= Math.max(0, foeNear - friendNear) * 2 * dt;
  if (u.engaged) delta -= 1.5 * dt;
  // elite hold longer
  delta += (def.morale / 100) * 2 * dt * bon.cohesionHold;

  u.morale = Math.max(0, Math.min(u.maxMorale, u.morale + delta));

  // recover cohesion slowly when not pressed
  if (!u.engaged && foeNear === 0) {
    u.cohesion = Math.min(1, u.cohesion + dt * 0.04 * bon.cohesionHold);
  }

  if (u.morale <= 12 || (u.hp / u.maxHp < 0.18 && u.morale < 35)) {
    u.routing = true;
  }
}

export function checkWinner(units: Unit[]): Faction | null {
  const rome = factionUnits(units, 'rome');
  const qin = factionUnits(units, 'qin');
  const romeAlive = units.filter((u) => u.faction === 'rome' && u.hp > 0 && !u.routing);
  const qinAlive = units.filter((u) => u.faction === 'qin' && u.hp > 0 && !u.routing);
  if (romeAlive.length === 0 && qinAlive.length === 0) return null;
  if (romeAlive.length === 0) return 'qin';
  if (qinAlive.length === 0) return 'rome';
  // also win if all remaining enemies are routing
  const romeFight = units.some((u) => u.faction === 'rome' && u.hp > 0 && !u.routing);
  const qinFight = units.some((u) => u.faction === 'qin' && u.hp > 0 && !u.routing);
  if (!romeFight && qinFight) return 'qin';
  if (!qinFight && romeFight) return 'rome';
  void rome;
  void qin;
  void aliveCount;
  return null;
}
