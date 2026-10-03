// Pure Speed math for Pokémon Champions (Level 50, perfect IVs).
// Order matches champions-logic speed_order: stage -> ability multiplier -> item -> Tailwind -> paralysis,
// flooring after each step. Trick Room only flips who moves first.

export type Alignments = Record<string, [string | null, string | null]>;

export interface Side {
  baseSpe: number;
  alignment: string;
  maxSpeed: boolean; // true = 32 SP, false = 0 SP
  stage: number; // -6..6
  abilityMult: number; // 1, 1.5 or 2 (already resolved against weather/status)
  itemMult: number; // 1, 1.5 (Choice Scarf) or 0.5 (Iron Ball)
  tailwind: boolean;
  paralyzed: boolean;
  ignoreParalysis: boolean; // Quick Feet
}

export interface Step {
  label: string;
  value: number;
}

export function alignmentMult(alignments: Alignments, name: string): number {
  const [up, down] = alignments[name] ?? [null, null];
  return up === 'spe' ? 1.1 : down === 'spe' ? 0.9 : 1;
}

export function statSpeed(baseSpe: number, sp: number, mult: number): number {
  // Integer math avoids float error: floor((base+20+SP) * 110 / 100).
  return Math.floor(((baseSpe + 20 + sp) * Math.round(mult * 100)) / 100);
}

export function stageApply(stat: number, stage: number): number {
  return stage >= 0 ? Math.floor((stat * (2 + stage)) / 2) : Math.floor((stat * 2) / (2 - stage));
}

export function finalSpeed(side: Side, alignments: Alignments): { speed: number; steps: Step[] } {
  const mult = alignmentMult(alignments, side.alignment);
  const sp = side.maxSpeed ? 32 : 0;
  let s = statSpeed(side.baseSpe, sp, mult);
  const steps: Step[] = [
    { label: `${side.maxSpeed ? 'Max' : 'Min'} Speed (base ${side.baseSpe} + 20 + ${sp} SP)`, value: side.baseSpe + 20 + sp },
    { label: `${side.alignment} ×${mult}`, value: s },
  ];
  if (side.stage) {
    s = stageApply(s, side.stage);
    steps.push({ label: `${side.stage > 0 ? '+' : ''}${side.stage} stage`, value: s });
  }
  if (side.abilityMult !== 1) {
    s = Math.floor(s * side.abilityMult);
    steps.push({ label: `ability ×${side.abilityMult}`, value: s });
  }
  if (side.itemMult !== 1) {
    s = Math.floor(s * side.itemMult);
    steps.push({ label: `item ×${side.itemMult}`, value: s });
  }
  if (side.tailwind) {
    s = Math.floor(s * 2);
    steps.push({ label: 'Tailwind ×2', value: s });
  }
  if (side.paralyzed && !side.ignoreParalysis) {
    s = Math.floor(s * 0.5);
    steps.push({ label: 'paralysis ×0.5', value: s });
  }
  return { speed: s, steps };
}

export type Answer = 'a' | 'b' | 'tie';

export function whoMovesFirst(a: number, b: number, trickRoom: boolean): Answer {
  if (a === b) return 'tie';
  return (a > b) !== trickRoom ? 'a' : 'b';
}
