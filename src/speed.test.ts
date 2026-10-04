// Expected values come from champions-logic speed_order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finalSpeed, whoMovesFirst, type Side } from './speed.ts';

const A = { Jolly: ['spe', 'spa'], Brave: ['atk', 'spe'], Serious: [null, null] } as const;
const side = (o: Partial<Side>): Side => ({
  baseSpe: 100, alignment: 'Serious', maxSpeed: true, stage: 0, abilityMult: 1, itemMult: 1,
  tailwind: false, paralyzed: false, ignoreParalysis: false, ...o,
});
const spe = (o: Partial<Side>) => finalSpeed(side(o), A as any).speed;

test('Garchomp Jolly Max, +1, Scarf, Tailwind = 758', () =>
  assert.equal(spe({ baseSpe: 102, alignment: 'Jolly', stage: 1, itemMult: 1.5, tailwind: true }), 758));
test('Incineroar Brave Min, -1, ×2, paralysis = 48', () =>
  assert.equal(spe({ baseSpe: 60, alignment: 'Brave', maxSpeed: false, stage: -1, abilityMult: 2, paralyzed: true }), 48));
test('Jolly Max base 100 = 167', () => assert.equal(spe({ alignment: 'Jolly' }), 167));
test('Quick Feet ignores paralysis', () => assert.equal(spe({ paralyzed: true, ignoreParalysis: true, abilityMult: 1.5 }), 228));
test('Trick Room flips, ties stay ties', () => {
  assert.equal(whoMovesFirst(100, 90, false), 'a');
  assert.equal(whoMovesFirst(100, 90, true), 'b');
  assert.equal(whoMovesFirst(90, 90, true), 'tie');
});
test('Unmodified: no alignment, no SP = base + 20', () =>
  assert.equal(spe({ baseSpe: 102, alignment: 'Jolly', maxSpeed: false, useAlignment: false, useInvestment: false }), 122));
