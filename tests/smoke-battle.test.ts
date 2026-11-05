import { describe, it, expect } from 'vitest';
import { createInitialState, startBattle, tick } from '../src/game/sim';

describe('smoke battle', () => {
  it('finishes a match within 180s sim time without hanging', () => {
    const s = createInitialState('rome');
    // auto-start with default deploy; give AI control of both by treating player as rome but issuing no orders
    startBattle(s);
    let steps = 0;
    const dt = 0.05;
    while (s.phase === 'battle' && steps < 180 / dt) {
      // clear player orders so rome also uses proximity auto-engage only
      tick(s, dt);
      steps++;
    }
    expect(s.phase).toBe('ended');
    expect(s.winner === 'rome' || s.winner === 'qin').toBe(true);
    expect(s.time).toBeGreaterThan(5);
  });
});
