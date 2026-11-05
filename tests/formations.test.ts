import { describe, it, expect } from 'vitest';
import { layoutFormation, formationBonus, cohesionPower, applyFormation } from '../src/game/formations';
import { createUnit, resetIds } from '../src/game/units';

describe('layoutFormation', () => {
  it('places exact soldier count for each formation', () => {
    for (const kind of ['line', 'wedge', 'square', 'skirmish'] as const) {
      const pts = layoutFormation(kind, 36, 'melee');
      expect(pts.length).toBe(36);
    }
  });

  it('line is wider than square on Y spread', () => {
    const line = layoutFormation('line', 36, 'melee');
    const square = layoutFormation('square', 36, 'melee');
    const span = (pts: { y: number }[]) =>
      Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    expect(span(line)).toBeGreaterThan(span(square));
  });

  it('skirmish spacing is looser than line', () => {
    const sk = layoutFormation('skirmish', 24, 'ranged');
    const line = layoutFormation('line', 24, 'ranged');
    const avgDist = (pts: { x: number; y: number }[]) => {
      let s = 0;
      let n = 0;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < Math.min(i + 4, pts.length); j++) {
          s += Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          n++;
        }
      }
      return s / n;
    };
    expect(avgDist(sk)).toBeGreaterThan(avgDist(line));
  });
});

describe('formationBonus', () => {
  it('square is tankiest, wedge hits hardest', () => {
    expect(formationBonus('square').defenseMul).toBeGreaterThan(formationBonus('line').defenseMul);
    expect(formationBonus('wedge').attackMul).toBeGreaterThan(formationBonus('line').attackMul);
    expect(formationBonus('skirmish').rangedMul).toBeGreaterThan(formationBonus('square').rangedMul);
  });
});

describe('cohesionPower', () => {
  it('broken cohesion crushes combat power', () => {
    resetIds();
    const u = createUnit('hastati', 0, 0, 0, 'line');
    u.cohesion = 1;
    const full = cohesionPower(u);
    u.cohesion = 0.2;
    const broken = cohesionPower(u);
    expect(full).toBeGreaterThan(broken * 1.5);
  });

  it('applyFormation reforms and restores some cohesion', () => {
    resetIds();
    const u = createUnit('principes', 0, 0, 0, 'line');
    u.cohesion = 0.4;
    applyFormation(u, 'square');
    expect(u.formation).toBe('square');
    expect(u.cohesion).toBeGreaterThan(0.4);
  });
});
