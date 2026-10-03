// Fetch Reg M-C team lists from Limitless and write data/usage.json:
//   { updated, teams, counts: {monId: teamCount}, sets: {monId: [[alignment, item, ability, moves[], weight]]} }
// Megas are counted separately (derived from the held Mega Stone). Keeps the old file if the fetch fails.
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://play.limitlesstcg.com/api';
const base = JSON.parse(readFileSync('data/base.json', 'utf8'));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const bySid = new Map(base.mons.filter((m) => !m.base).map((m) => [norm(m.sid), m]));
// Limitless names that differ from Showdown ids.
for (const [alias, id] of Object.entries({ floette: 'floetteeternal' })) {
  const m = base.mons.find((x) => x.id === id);
  if (m) bySid.set(alias, m);
}
// Only moves that change Speed matter here; dropping the rest keeps usage.json small.
const SPEED_MOVES = new Set(['dragondance', 'quiverdance', 'shiftgear', 'agility', 'rockpolish', 'flamecharge', 'autotomize', 'trailblaze', 'tailwind', 'trickroom', 'icywind', 'electroweb', 'bulldoze', 'scaryface', 'thunderwave', 'nuzzle', 'glare', 'raindance', 'sunnyday', 'sandstorm', 'snowscape', 'electricterrain']);
const itemSlug = new Map(Object.entries(base.items).map(([slug, name]) => [norm(name), slug]));
const megaByStone = new Map(base.mons.filter((m) => m.stone).map((m) => [m.stone, m]));
// Mainline-only neutral natures don't exist in Champions; Serious is the only neutral alignment.
const toAlign = (n) => (n && base.alignments[n] ? n : 'Serious');

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
  }
  throw new Error(`GET ${url} failed`);
};

try {
  const tours = (await get(`${API}/tournaments?game=VGC&format=M-C&limit=2000`)).filter((t) => t.format === 'M-C');
  const counts = {}, sets = {}, unknown = {};
  let teams = 0;
  for (const t of tours) {
    let standings;
    try { standings = await get(`${API}/tournaments/${t.id}/standings`); } catch { continue; }
    for (const p of standings) {
      if (!Array.isArray(p.decklist) || !p.decklist.length) continue;
      teams++;
      const seen = new Set();
      for (const e of p.decklist) {
        let mon = bySid.get(norm(e.id)) || bySid.get(norm(e.name));
        if (!mon) { unknown[e.id] = (unknown[e.id] || 0) + 1; continue; }
        const item = itemSlug.get(norm(e.item)) || null;
        let ability = e.ability ? norm(e.ability) : null;
        const mega = item && megaByStone.get(item);
        if (mega && mega.base === mon.id) { mon = mega; ability = mega.abilities[0]; }
        else ability = Object.keys(base.abilities).find((a) => norm(a) === ability) || mon.abilities[0];
        if (!seen.has(mon.id)) { counts[mon.id] = (counts[mon.id] || 0) + 1; seen.add(mon.id); }
        const moves = (e.attacks || []).map(norm).filter((m) => SPEED_MOVES.has(m));
        const key = [toAlign(e.nature), item, ability, moves.sort().join(',')].join('|');
        (sets[mon.id] ||= {})[key] = ((sets[mon.id] ||= {})[key] || 0) + 1;
      }
    }
  }
  if (teams < 50) throw new Error(`only ${teams} teams; refusing to overwrite`);
  const outSets = {};
  for (const [id, m] of Object.entries(sets))
    outSets[id] = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 40)
      .map(([k, w]) => { const [a, i, ab, mv] = k.split('|'); return [a, i || null, ab, mv ? mv.split(',') : [], w]; });
  writeFileSync('data/usage.json', JSON.stringify({ updated: new Date().toISOString(), tournaments: tours.length, teams, counts, sets: outSets }));
  console.log(`${tours.length} tournaments, ${teams} teams, ${Object.keys(counts).length} mons. Unmatched:`, Object.entries(unknown).sort((a, b) => b[1] - a[1]).slice(0, 15));
} catch (err) {
  console.error('Usage fetch failed, keeping existing data/usage.json:', err.message);
}
