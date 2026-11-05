import { describe, it, expect } from 'vitest';
import { createUnit, resetIds } from '../src/game/units';
import {
  attackAspect,
  aspectMul,
  resolveMelee,
  killSoldiers,
  tryRanged,
} from '../src/game/combat';
import { formationBonus } from '../src/game/formations';

describe('attackAspect', () => {
  it('detects front flank and rear', () => {
    resetIds();
    const def = createUnit('bubing', 100, 100, 0, 'line');
    expect(attackAspect(def, { x: 150, y: 100 })).toBe('front');
    expect(attackAspect(def, { x: 100, y: 150 })).toBe('flank');
    expect(attackAspect(def, { x: 50, y: 100 })).toBe('rear');
  });

  it('rear multiplies damage more than front', () => {
    const resist = formationBonus('line').flankResist;
    expect(aspectMul('rear', resist)).toBeGreaterThan(aspectMul('front', resist));
    expect(aspectMul('flank', resist)).toBeGreaterThan(aspectMul('front', resist));
  });
});

describe('resolveMelee', () => {
  it('deals damage over time and wears cohesion', () => {
    resetIds();
    const a = createUnit('principes', 0, 0, 0, 'wedge');
    const d = createUnit('bubing', 30, 0, Math.PI, 'line');
    const hp0 = d.hp;
    const coh0 = d.cohesion;
    resolveMelee(a, d, 0.5, []);
    expect(d.hp).toBeLessThan(hp0);
    expect(d.cohesion).toBeLessThan(coh0);
  });

  it('square holds better than skirmish under equal pressure', () => {
    resetIds();
    const atk1 = createUnit('hastati', 0, 0, 0, 'line');
    const atk2 = createUnit('hastati', 0, 0, 0, 'line');
    const square = createUnit('bubing', 40, 0, Math.PI, 'square');
    const skirm = createUnit('bubing', 40, 0, Math.PI, 'skirmish');
    for (let i = 0; i < 4; i++) {
      resolveMelee(atk1, square, 0.15, []);
      resolveMelee(atk2, skirm, 0.15, []);
    }
    expect(square.hp).toBeGreaterThan(skirm.hp);
    expect(square.cohesion).toBeGreaterThan(skirm.cohesion);
  });
});

describe('killSoldiers / ranged', () => {
  it('kills soldiers proportional to hp loss', () => {
    resetIds();
    const u = createUnit('hastati', 0, 0, 0, 'line');
    const before = u.soldiers.filter((s) => s.alive).length;
    killSoldiers(u, u.maxHp * 0.5);
    const after = u.soldiers.filter((s) => s.alive).length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it('crossbow can fire a bolt in range', () => {
    resetIds();
    const shooter = createUnit('nubing', 0, 0, 0, 'skirmish');
    const target = createUnit('hastati', 150, 0, Math.PI, 'line');
    const projectiles: Parameters<typeof tryRanged>[2] = [];
    expect(tryRanged(shooter, target, projectiles)).toBe(true);
    expect(projectiles.length).toBe(1);
    expect(projectiles[0].kind).toBe('bolt');
  });
});
