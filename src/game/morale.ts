import type { Unit, Faction } from './types';
import { aliveCount, defOf, factionUnits } from './units';
import { formationBonus, lastStandBonus } from './formations';

export function updateMorale(u: Unit, allies: Unit[], enemies: Unit[], dt: number): void {
  if (u.hp <= 0) {
    u.routing = true;
    return;
  }
  const def = defOf(u);
  const bon = formationBonus(u.formation);
  const stand = lastStandBonus(u, allies);
  const loss = 1 - u.hp / u.maxHp;
  const coh = u.cohesion;

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
  delta += (def.morale / 100) * 2 * dt * bon.cohesionHold;

  // Triarii last stand: when front collapses, they dig in instead of panicking with the line.
  if (stand.active) {
    delta += 14 * dt * stand.morale;
    // Soft cohesion brace while holding the rear.
    u.cohesion = Math.min(1, u.cohesion + dt * 0.06 * stand.cohesion);
  }

  u.morale = Math.max(0, Math.min(u.maxMorale, u.morale + delta));

  if (!u.engaged && foeNear === 0) {
    u.cohesion = Math.min(1, u.cohesion + dt * 0.04 * bon.cohesionHold);
  }

  // Higher morale floor while last-standing so they don't evaporate with the hastati.
  const routeFloor = stand.active ? 6 : 12;
  const hpPanic = stand.active ? 0.1 : 0.18;
  if (u.morale <= routeFloor || (u.hp / u.maxHp < hpPanic && u.morale < (stand.active ? 20 : 35))) {
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
  const romeFight = units.some((u) => u.faction === 'rome' && u.hp > 0 && !u.routing);
  const qinFight = units.some((u) => u.faction === 'qin' && u.hp > 0 && !u.routing);
  if (!romeFight && qinFight) return 'qin';
  if (!qinFight && romeFight) return 'rome';
  void rome;
  void qin;
  void aliveCount;
  return null;
}
