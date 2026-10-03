// Question generation: picks two Pokémon, builds a set for each (80% real from Limitless, 20% random),
// rolls field/effects from the enabled toggles, and resolves who moves first.
import { finalSpeed, whoMovesFirst, type Alignments, type Answer, type Step } from './speed.ts';

export interface Mon {
  id: string;
  name: string;
  spe: number;
  abilities: string[];
  base?: string;
  stone?: string;
  sprite: string | null;
}
export interface Base {
  mons: Mon[];
  items: Record<string, string>;
  abilities: Record<string, string>;
  alignments: Alignments;
}
export type RealSet = [string, string | null, string, string[], number]; // alignment, item, ability, speed moves, weight
export interface Usage {
  updated: string;
  teams: number;
  counts: Record<string, number>;
  sets: Record<string, RealSet[]>;
}

export const EFFECTS = {
  scarf: 'Choice Scarf',
  ironBall: 'Iron Ball',
  stages: 'Stat stages',
  tailwind: 'Tailwind',
  trickRoom: 'Trick Room',
  paralysis: 'Paralysis',
  weather: 'Weather & terrain',
  abilities: 'Unburden & Quick Feet',
} as const;
export type Effect = keyof typeof EFFECTS;
export interface Settings {
  effects: Record<Effect, boolean>;
  close: boolean;
}
export const isChaos = (s: Settings) => Object.values(s.effects).every(Boolean);

type Weather = 'Rain' | 'Sun' | 'Sandstorm' | 'Snow';
const WEATHER_ABILITY: Record<string, Weather> = {
  'swift-swim': 'Rain',
  chlorophyll: 'Sun',
  'sand-rush': 'Sandstorm',
  'slush-rush': 'Snow',
};
const BOOST_MOVES: Record<string, number> = {
  dragondance: 1, quiverdance: 1, flamecharge: 1, trailblaze: 1,
  shiftgear: 2, agility: 2, rockpolish: 2, autotomize: 2,
};

export interface Card {
  mon: Mon;
  real: boolean;
  alignment: string;
  maxSpeed: boolean;
  item: string | null;
  itemConsumed: boolean;
  ability: string;
  stage: number;
  stageSource: string;
  status: 'Paralysis' | 'Burn' | null;
  tailwind: boolean;
  speed: number;
  steps: Step[];
}
export interface Field {
  trickRoom: boolean;
  weather: Weather | null;
  electricTerrain: boolean;
}
export interface Question {
  a: Card;
  b: Card;
  field: Field;
  answer: Answer;
}

type Rng = () => number;
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const pickWeighted = <T>(rng: Rng, xs: readonly T[], w: (x: T) => number): T => {
  let r = rng() * xs.reduce((n, x) => n + w(x), 0);
  for (const x of xs) if ((r -= w(x)) < 0) return x;
  return xs[xs.length - 1];
};

/** Top 20% of unique Pokémon (Megas counted separately) by team count. */
export function metaList(base: Base, usage: Usage): string[] {
  const known = new Set(base.mons.map((m) => m.id));
  const ranked = Object.entries(usage.counts).filter(([id]) => known.has(id)).sort((a, b) => b[1] - a[1]);
  return ranked.slice(0, Math.ceil(ranked.length * 0.2)).map(([id]) => id);
}

export class Generator {
  private stones: Set<string>;
  private plainItems: string[];
  private base: Base;
  private usage: Usage;
  private rng: Rng;
  constructor(base: Base, usage: Usage, rng: Rng = Math.random) {
    this.base = base;
    this.usage = usage;
    this.rng = rng;
    this.stones = new Set(base.mons.flatMap((m) => (m.stone ? [m.stone] : [])));
    this.plainItems = Object.keys(base.items).filter(
      (i) => !this.stones.has(i) && i !== 'choice-scarf' && i !== 'iron-ball',
    );
  }

  private speedItemAllowed(item: string | null, s: Settings) {
    return !((item === 'choice-scarf' && !s.effects.scarf) || (item === 'iron-ball' && !s.effects.ironBall));
  }

  private buildSet(mon: Mon, s: Settings): Pick<Card, 'real' | 'alignment' | 'item' | 'ability'> & { moves: string[] } {
    const sets = (this.usage.sets[mon.id] ?? []).filter((x) => this.speedItemAllowed(x[1], s));
    if (sets.length && this.rng() < 0.8) {
      const [alignment, item, ability, moves] = pickWeighted(this.rng, sets, (x) => x[4]);
      return { real: true, alignment, item, ability: mon.abilities.includes(ability) ? ability : mon.abilities[0], moves };
    }
    let item: string;
    if (mon.stone) item = mon.stone;
    else {
      const r = this.rng();
      item = r < 0.2 && s.effects.scarf ? 'choice-scarf' : r > 0.92 && s.effects.ironBall ? 'iron-ball' : pick(this.rng, this.plainItems);
    }
    return {
      real: false,
      alignment: pick(this.rng, Object.keys(this.base.alignments)),
      item,
      ability: pick(this.rng, mon.abilities),
      moves: [],
    };
  }

  private card(mon: Mon, s: Settings): Card & { moves: string[] } {
    const set = this.buildSet(mon, s);
    const c = {
      mon, ...set, maxSpeed: this.rng() < 0.75, // independent of alignment so Min Speed never reveals a −Spe alignment itemConsumed: false, stage: 0, stageSource: '',
      status: null as Card['status'], tailwind: false, speed: 0, steps: [] as Step[],
    };
    const e = s.effects, rng = this.rng;
    if (e.stages) {
      const boost = set.moves.find((m) => BOOST_MOVES[m]);
      if (c.ability === 'speed-boost' && rng() < 0.4) [c.stage, c.stageSource] = [1, 'Speed Boost'];
      else if (boost && rng() < 0.3) [c.stage, c.stageSource] = [BOOST_MOVES[boost], boost];
      else if (rng() < 0.1) {
        const r = rng();
        [c.stage, c.stageSource] = r < 0.5 ? [-1, pick(rng, ['Icy Wind', 'Electroweb'])] : [pick(rng, [-2, -1, 1, 2]), ''];
      }
    }
    if (e.tailwind && rng() < 0.05) c.tailwind = true;
    if (e.paralysis && rng() < 0.05) c.status = 'Paralysis';
    if (e.abilities && c.ability === 'quick-feet' && !c.status && rng() < 0.4) c.status = e.paralysis && rng() < 0.5 ? 'Paralysis' : 'Burn';
    if (e.abilities && c.ability === 'unburden' && c.item && rng() < 0.4) c.itemConsumed = true;
    return c;
  }

  private resolve(c: Card, f: Field) {
    const ab = c.ability;
    let abilityMult = 1;
    if (WEATHER_ABILITY[ab] && WEATHER_ABILITY[ab] === f.weather) abilityMult = 2;
    if (ab === 'surge-surfer' && f.electricTerrain) abilityMult = 2;
    if (ab === 'unburden' && c.itemConsumed) abilityMult = 2;
    if (ab === 'quick-feet' && c.status) abilityMult = 1.5;
    const heldItem = c.itemConsumed ? null : c.item;
    const r = finalSpeed({
      baseSpe: c.mon.spe, alignment: c.alignment, maxSpeed: c.maxSpeed, stage: c.stage, abilityMult,
      itemMult: heldItem === 'choice-scarf' ? 1.5 : heldItem === 'iron-ball' ? 0.5 : 1,
      tailwind: c.tailwind, paralyzed: c.status === 'Paralysis', ignoreParalysis: ab === 'quick-feet',
    }, this.base.alignments);
    c.speed = r.speed;
    c.steps = r.steps;
  }

  private field(a: Card, b: Card, s: Settings): Field {
    const e = s.effects, rng = this.rng;
    const f: Field = { trickRoom: e.trickRoom && rng() < 0.05, weather: null, electricTerrain: false };
    if (e.weather) {
      const own = [a, b].map((c) => WEATHER_ABILITY[c.ability]).filter(Boolean);
      if (own.length && rng() < 0.35) f.weather = pick(rng, own);
      else if (rng() < 0.05) f.weather = pick(rng, ['Rain', 'Sun', 'Sandstorm', 'Snow'] as const);
      const surfer = [a, b].some((c) => c.ability === 'surge-surfer');
      f.electricTerrain = rng() < (surfer ? 0.35 : 0.03);
    }
    return f;
  }

  private once(pool: Mon[], s: Settings): Question {
    const ma = pick(this.rng, pool);
    let mb = pick(this.rng, pool);
    while (pool.length > 1 && mb.id === ma.id) mb = pick(this.rng, pool);
    const a = this.card(ma, s), b = this.card(mb, s);
    const field = this.field(a, b, s);
    this.resolve(a, field);
    this.resolve(b, field);
    return { a, b, field, answer: whoMovesFirst(a.speed, b.speed, field.trickRoom) };
  }

  /** Deliberate ties 5% of the time (10% in Chaos); Close mode keeps final speeds within 10. */
  next(pool: Mon[], s: Settings): Question | null {
    if (pool.length < 2) return null;
    const wantTie = this.rng() < (isChaos(s) ? 0.1 : 0.05);
    let fallback: Question | null = null;
    for (let i = 0; i < 4000; i++) {
      const q = this.once(pool, s);
      const gap = Math.abs(q.a.speed - q.b.speed);
      if (s.close && gap > 10) continue;
      fallback ??= q;
      if (wantTie ? gap === 0 : true) return q;
    }
    return fallback;
  }
}
