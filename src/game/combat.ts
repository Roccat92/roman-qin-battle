import type { Unit, Projectile, Particle, Vec2 } from './types';
import { defOf, aliveCount } from './units';
import {
  formationBonus,
  cohesionPower,
  worldSoldierPos,
  missileAbsorb,
  lastStandBonus,
} from './formations';

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Aspect based on attacker relative to defender facing. */
export function attackAspect(defender: Unit, attackerPos: Vec2): 'front' | 'flank' | 'rear' {
  const toAtk = angleTo(defender, attackerPos);
  let diff = toAtk - defender.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const a = Math.abs(diff);
  if (a < Math.PI * 0.4) return 'front';
  if (a > Math.PI * 0.75) return 'rear';
  return 'flank';
}

export function aspectMul(aspect: 'front' | 'flank' | 'rear', flankResist: number): number {
  if (aspect === 'front') return 1;
  if (aspect === 'flank') return 1.45 / Math.max(0.5, flankResist);
  return 1.9 / Math.max(0.5, flankResist * 0.85);
}

export function killSoldiers(u: Unit, lossHp: number): number {
  if (lossHp <= 0 || u.hp <= 0) return 0;
  const before = u.hp;
  u.hp = Math.max(0, u.hp - lossHp);
  const ratio = u.hp / u.maxHp;
  const targetAlive = Math.max(0, Math.ceil(u.soldiers.length * ratio));
  let alive = aliveCount(u);
  while (alive > targetAlive) {
    for (let i = u.soldiers.length - 1; i >= 0; i--) {
      if (u.soldiers[i].alive) {
        u.soldiers[i].alive = false;
        alive--;
        break;
      }
    }
  }
  if (u.hp <= 0) {
    u.routing = true;
    for (const s of u.soldiers) s.alive = false;
  }
  return before - u.hp;
}

/**
 * Cohesion shatter from a hit. Cavalry flank/rear is the main formation-breaker:
 * they disorder the line far more than they carve HP.
 */
export function cohesionShatter(
  attacker: Unit,
  defender: Unit,
  aspect: 'front' | 'flank' | 'rear',
  dt: number,
  chargeBonus: boolean,
): number {
  const aDef = defOf(attacker);
  const dBon = formationBonus(defender.formation);
  const isCav = aDef.role === 'cavalry';
  let wear =
    0.08 + (aspect === 'flank' ? 0.12 : 0) + (aspect === 'rear' ? 0.22 : 0);

  if (isCav) {
    // Cavalry job: smash order. Flank/rear shatters; front still pressures.
    if (aspect === 'rear') wear += 0.55;
    else if (aspect === 'flank') wear += 0.42;
    else wear += 0.12;
    if (chargeBonus) wear *= 1.55;
  } else if (chargeBonus) {
    wear *= 1.35;
  }

  const amount = (wear * dt) / Math.max(0.35, dBon.cohesionHold);
  return amount;
}

export function resolveMelee(
  attacker: Unit,
  defender: Unit,
  dt: number,
  particles: Particle[],
  alliesOfDefender: Unit[] = [],
): number {
  const aDef = defOf(attacker);
  const dDef = defOf(defender);
  const aBon = formationBonus(attacker.formation);
  const dBon = formationBonus(defender.formation);
  const aspect = attackAspect(defender, attacker);
  const stand = lastStandBonus(defender, alliesOfDefender);
  const chargeBonus = !attacker.engaged;
  const aMul =
    aBon.attackMul *
    cohesionPower(attacker) *
    (chargeBonus ? aDef.charge : 1) *
    aspectMul(aspect, dBon.flankResist);
  const dMul = dBon.defenseMul * cohesionPower(defender) * stand.defense;

  const pressure =
    (aDef.attack * aMul * (0.7 + 0.3 * (aliveCount(attacker) / Math.max(1, aDef.soldiers)))) /
    Math.max(0.4, dDef.defense * dMul * 0.15);

  const dmg = pressure * dt * 9;
  const dealt = killSoldiers(defender, dmg);

  let wear = cohesionShatter(attacker, defender, aspect, dt, chargeBonus);
  // Triarii last stand resists disorder harder.
  wear /= stand.cohesion;
  defender.cohesion = Math.max(0.05, defender.cohesion - wear);
  attacker.cohesion = Math.max(0.05, attacker.cohesion - dt * 0.03);

  if (dealt > 0 && Math.random() < 0.4) {
    spawnBlood(particles, defender.x, defender.y);
  }
  return dealt;
}

export function tryRanged(
  shooter: Unit,
  target: Unit,
  projectiles: Projectile[],
): boolean {
  const def = defOf(shooter);
  if (def.range <= 0 || shooter.rangedCooldown > 0 || shooter.routing) return false;
  const d = dist(shooter, target);
  if (d > def.range || d < 40) return false;

  const bon = formationBonus(shooter.formation);
  const aim = angleTo(shooter, target);
  shooter.facing = aim;
  const speed = def.role === 'ranged' && def.id === 'nubing' ? 420 : 340;
  const spread = (1.1 - shooter.cohesion) * 0.25;
  const a = aim + (Math.random() - 0.5) * spread;
  const kind = def.faction === 'rome' ? (def.id === 'velites' ? 'javelin' : 'pilum') : 'bolt';
  projectiles.push({
    x: shooter.x + Math.cos(a) * 20,
    y: shooter.y + Math.sin(a) * 20,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    dmg: def.rangedAttack * bon.rangedMul * cohesionPower(shooter) * 0.55,
    faction: shooter.faction,
    life: 1.2,
    kind,
  });
  shooter.rangedCooldown = def.id === 'nubing' ? 1.4 : 1.1;
  return true;
}

/** Apply projectile hit: missile absorb (testudo) then residual damage. */
export function applyMissileHit(u: Unit, rawDmg: number, from: Vec2): number {
  const bon = formationBonus(u.formation);
  const aspect = attackAspect(u, from);
  const absorb = missileAbsorb(u);
  const afterBlock = rawDmg * (1 - absorb);
  const mul = aspectMul(aspect, bon.flankResist) / bon.defenseMul;
  const dealt = killSoldiers(u, afterBlock * mul);
  // Held testudo barely loses order to bolts; broken lines still flinch.
  const cohHit = absorb > 0.5 ? 0.004 : 0.02 * (1 - absorb * 0.5);
  u.cohesion = Math.max(0.05, u.cohesion - cohHit);
  return dealt;
}

export function stepProjectiles(
  projectiles: Projectile[],
  units: Unit[],
  particles: Particle[],
  dt: number,
): void {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    let hit = false;
    for (const u of units) {
      if (u.faction === p.faction || u.routing || u.hp <= 0) continue;
      if (dist(p, u) < 28) {
        const dealt = applyMissileHit(u, p.dmg, p);
        if (dealt > 0.15 || missileAbsorb(u) < 0.5) {
          spawnBlood(particles, p.x, p.y);
        }
        hit = true;
        break;
      }
    }
    if (hit || p.life <= 0) projectiles.splice(i, 1);
  }
}

export function spawnBlood(particles: Particle[], x: number, y: number): void {
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 20 + Math.random() * 60;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.3,
      maxLife: 0.6,
      color: '#8b0000',
      size: 2 + Math.random() * 2,
      kind: 'blood',
    });
  }
}

export function spawnDust(particles: Particle[], x: number, y: number, speed: number): void {
  if (speed < 30 || Math.random() > 0.3) return;
  particles.push({
    x: x + (Math.random() - 0.5) * 20,
    y: y + (Math.random() - 0.5) * 20,
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 20,
    life: 0.5,
    maxLife: 0.5,
    color: 'rgba(180,160,120,0.5)',
    size: 6 + Math.random() * 8,
    kind: 'dust',
  });
}

export function stepParticles(particles: Particle[], dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function unitRadius(u: Unit): number {
  const n = Math.max(4, aliveCount(u));
  const bon = formationBonus(u.formation);
  return 18 + Math.sqrt(n) * 6 * (u.formation === 'skirmish' ? 1.2 : 0.9) * (2 - bon.cohesionHold * 0.3);
}

export function nearestEnemy(u: Unit, units: Unit[]): Unit | null {
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const o of units) {
    if (o.faction === u.faction || o.routing || o.hp <= 0) continue;
    const d = dist(u, o);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

export { worldSoldierPos, missileAbsorb, lastStandBonus };
