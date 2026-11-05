import { describe, it, expect } from 'vitest';
import { createUnit, resetIds } from '../src/game/units';
import { updateMorale, checkWinner } from '../src/game/morale';

describe('morale', () => {
  it('routes when morale collapses', () => {
    resetIds();
    const u = createUnit('velites', 0, 0, 0, 'skirmish');
    u.morale = 15;
    u.hp = u.maxHp * 0.2;
    u.cohesion = 0.2;
    const foe = createUnit('bubing', 40, 0, Math.PI, 'line');
    for (let i = 0; i < 30; i++) updateMorale(u, [u], [foe], 0.2);
    expect(u.routing).toBe(true);
  });

  checkWinner;
});

describe('checkWinner', () => {
  it('returns rome when all qin routed', () => {
    resetIds();
    const r = createUnit('hastati', 0, 0, 0, 'line');
    const q = createUnit('bubing', 100, 0, Math.PI, 'line');
    q.routing = true;
    expect(checkWinner([r, q])).toBe('rome');
  });

  it('returns null while both sides fight', () => {
    resetIds();
    const r = createUnit('hastati', 0, 0, 0, 'line');
    const q = createUnit('bubing', 100, 0, Math.PI, 'line');
    expect(checkWinner([r, q])).toBe(null);
  });
});
