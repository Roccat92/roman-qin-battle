import { describe, it, expect } from 'vitest';
import { createUnit, resetIds } from '../src/game/units';
import {
  applyMissileHit,
  resolveMelee,
  cohesionShatter,
  attackAspect,
} from '../src/game/combat';
import { missileAbsorb, lastStandBonus, brokenFrontCount } from '../src/game/formations';
import { updateMorale } from '../src/game/morale';

describe('testudo missile block', () => {
  it('held square absorbs most Qin bolt damage vs line', () => {
    resetIds();
    const square = createUnit('principes', 0, 0, 0, 'square');
    square.cohesion = 1;
    const line = createUnit('principes', 0, 0, 0, 'line');
    line.cohesion = 1;
    expect(missileAbsorb(square)).toBeGreaterThan(0.75);
    expect(missileAbsorb(square)).toBeGreaterThan(missileAbsorb(line) * 3);

    const bolt = 12;
    const from = { x: 100, y: 0 };
    const hpSq0 = square.hp;
    const hpLn0 = line.hp;
    applyMissileHit(square, bolt, from);
    applyMissileHit(line, bolt, from);
    const lostSq = hpSq0 - square.hp;
    const lostLn = hpLn0 - line.hp;
    expect(lostSq).toBeLessThan(lostLn * 0.35);
    expect(lostSq).toBeLessThan(bolt * 0.25);
  });

  it('broken square loses missile protection', () => {
    resetIds();
    const held = createUnit('triarii', 0, 0, 0, 'square');
    held.cohesion = 0.95;
    const broken = createUnit('triarii', 0, 0, 0, 'square');
    broken.cohesion = 0.25;
    expect(missileAbsorb(held)).toBeGreaterThan(0.7);
    expect(missileAbsorb(broken)).toBeLessThan(0.15);

    const bolt = 14;
    const from = { x: 80, y: 0 };
    const h0 = held.hp;
    const b0 = broken.hp;
    applyMissileHit(held, bolt, from);
    applyMissileHit(broken, bolt, from);
    expect(b0 - broken.hp).toBeGreaterThan((h0 - held.hp) * 2.5);
  });
});

describe('cavalry cohesion shatter', () => {
  it('cavalry flank/rear disorder far more than front infantry pressure', () => {
    resetIds();
    const target = createUnit('bubing', 100, 100, 0, 'line'); // face +X
    const cavFlank = createUnit('equites', 100, 160, 0, 'wedge');
    const cavRear = createUnit('equites', 40, 100, 0, 'wedge');
    const infFront = createUnit('hastati', 150, 100, Math.PI, 'line');

    expect(attackAspect(target, cavFlank)).toBe('flank');
    expect(attackAspect(target, cavRear)).toBe('rear');
    expect(attackAspect(target, infFront)).toBe('front');

    const flankWear = cohesionShatter(cavFlank, target, 'flank', 0.5, true);
    const rearWear = cohesionShatter(cavRear, target, 'rear', 0.5, true);
    const frontWear = cohesionShatter(infFront, target, 'front', 0.5, true);
    expect(flankWear).toBeGreaterThan(frontWear * 2.5);
    expect(rearWear).toBeGreaterThan(flankWear);
  });

  it('cavalry rear charge breaks cohesion faster than HP ratio implies', () => {
    resetIds();
    const line = createUnit('bubing', 200, 100, 0, 'line');
    const cav = createUnit('qibing', 120, 100, 0, 'wedge'); // behind / west = rear
    expect(attackAspect(line, cav)).toBe('rear');
    const hp0 = line.hp;
    const coh0 = line.cohesion;
    for (let i = 0; i < 6; i++) {
      resolveMelee(cav, line, 0.2, []);
      cav.engaged = false; // keep charge-ish shatter
    }
    const hpLostFrac = (hp0 - line.hp) / hp0;
    const cohLost = coh0 - line.cohesion;
    expect(cohLost).toBeGreaterThan(0.35);
    // Cohesion should collapse harder than a proportional HP scrape.
    expect(cohLost).toBeGreaterThan(hpLostFrac * 0.9);
  });
});

describe('triarii last stand', () => {
  it('activates when friendly units ahead are routing/destroyed', () => {
    resetIds();
    const triarii = createUnit('triarii', 100, 100, 0, 'square'); // face +X
    const hastati = createUnit('hastati', 180, 100, 0, 'line'); // ahead
    hastati.routing = true;
    expect(brokenFrontCount(triarii, [triarii, hastati])).toBe(1);
    const bon = lastStandBonus(triarii, [triarii, hastati]);
    expect(bon.active).toBe(true);
    expect(bon.defense).toBeGreaterThan(1.1);
    expect(bon.morale).toBeGreaterThan(1.2);
  });

  it('holds morale/defense much harder than principes after front collapses', () => {
    resetIds();
    const triarii = createUnit('triarii', 100, 100, 0, 'square');
    const principes = createUnit('principes', 100, 200, 0, 'line');
    const front = createUnit('hastati', 180, 100, 0, 'line');
    front.routing = true;
    const foe = createUnit('bubing', 220, 100, Math.PI, 'line');

    const alliesT = [triarii, front];
    const alliesP = [principes, front];
    // Same pressure ticks
    for (let i = 0; i < 25; i++) {
      updateMorale(triarii, alliesT, [foe], 0.2);
      updateMorale(principes, alliesP, [foe], 0.2);
      // chip both with same frontal melee
      resolveMelee(foe, triarii, 0.15, [], alliesT);
      resolveMelee(foe, principes, 0.15, [], alliesP);
    }
    expect(triarii.routing).toBe(false);
    expect(triarii.hp).toBeGreaterThan(principes.hp);
    expect(triarii.morale).toBeGreaterThan(principes.morale);
  });
});
