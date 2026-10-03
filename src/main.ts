import './style.css';
import { registerSW } from 'virtual:pwa-register';
import baseJson from '../data/base.json';
import usageJson from '../data/usage.json';
import { EFFECTS, Generator, metaList, type Base, type Card, type Effect, type Mon, type Question, type Settings, type Usage } from './game.ts';
import type { Answer } from './speed.ts';

registerSW({ immediate: true });

const base = baseJson as unknown as Base;
const usage = usageJson as unknown as Usage;
const byId = new Map(base.mons.map((m) => [m.id, m]));
const gen = new Generator(base, usage);
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const SPRITES = `${import.meta.env.BASE_URL}sprites/`;
const STAT: Record<string, string> = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

// ---- persisted state ----
interface State {
  settings: Settings;
  list: string;
  custom: Record<string, string[]>;
  streaks: Record<string, { cur: number; best: number }>;
}
const KEY = 'speed-tier-game';
const defaults: State = {
  settings: { effects: Object.fromEntries(Object.keys(EFFECTS).map((k) => [k, false])) as Record<Effect, boolean>, close: false },
  list: 'Meta',
  custom: {},
  streaks: {},
};
const state: State = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return s ? { ...defaults, ...s, settings: { ...defaults.settings, ...s.settings, effects: { ...defaults.settings.effects, ...s.settings?.effects } } } : defaults;
  } catch {
    return defaults;
  }
})();
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
};

// ---- lists ----
const META = metaList(base, usage);
const builtIn: Record<string, () => string[]> = { Meta: () => META, 'All M-C': () => base.mons.map((m) => m.id) };
const listIds = (name: string) => (builtIn[name]?.() ?? state.custom[name] ?? META);
const pool = (): Mon[] => listIds(state.list).map((id) => byId.get(id)).filter((m): m is Mon => !!m);
const streak = () => (state.streaks[state.list] ??= { cur: 0, best: 0 });

// ---- rendering ----
const alignLabel = (a: string) => {
  const [up, down] = base.alignments[a] ?? [null, null];
  return up ? `${a} (+${STAT[up]} −${STAT[down!]})` : `${a} (neutral)`;
};
const itemName = (c: Card) => (c.item ? base.items[c.item] ?? c.item : 'No item') + (c.itemConsumed ? ' (consumed)' : '');
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&${({ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' } as Record<string, string>)[ch]};`);

function cardHtml(c: Card, key: string) {
  const tags = [
    c.stage ? `${c.stage > 0 ? '+' : ''}${c.stage} Spe${c.stageSource ? ` (${esc(c.stageSource)})` : ''}` : '',
    c.tailwind ? 'Tailwind' : '',
    c.status ?? '',
  ].filter(Boolean);
  return `${c.mon.sprite ? `<img src="${SPRITES}${c.mon.sprite}.webp" alt="" width="96" height="96" decoding="async">` : ''}
    <span class="name">${esc(c.mon.name)}</span>
    <span class="line">${esc(c.alignment)}</span>
    <span class="line"><b>${c.maxSpeed ? 'Max Speed' : 'Min Speed'}</b></span>
    <span class="sub">${esc(itemName(c))}</span>
    <span class="sub">${esc(base.abilities[c.ability] ?? c.ability)}</span>
    <span class="tag">${tags.join(' · ')}</span>
    <kbd>${key}</kbd>`;
}

let q: Question | null = null;
let answered = false;

function renderScore() {
  $('streak').textContent = String(streak().cur);
  $('best').textContent = String(streak().best);
  $('meta').textContent = `${state.list} · ${pool().length} Pokémon`;
}

function nextQuestion() {
  q = gen.next(pool(), state.settings);
  answered = false;
  $('result').hidden = true;
  for (const id of ['card-a', 'card-b', 'tie']) $(id).className = id === 'tie' ? 'tie' : 'card';
  if (!q) {
    $('field').textContent = 'This list needs at least two Pokémon. Pick another in Settings.';
    $('card-a').innerHTML = $('card-b').innerHTML = '';
    return;
  }
  const f = q.field;
  $('field').textContent = [f.trickRoom && 'Trick Room', f.weather, f.electricTerrain && 'Electric Terrain'].filter(Boolean).join(' · ');
  $('card-a').innerHTML = cardHtml(q.a, '←');
  $('card-b').innerHTML = cardHtml(q.b, '→');
  renderScore();
}

function answer(pickAns: Answer) {
  if (!q || answered) return;
  answered = true;
  const right = pickAns === q.answer;
  const s = streak();
  s.cur = right ? s.cur + 1 : 0;
  s.best = Math.max(s.best, s.cur);
  save();
  const el = { a: 'card-a', b: 'card-b', tie: 'tie' } as const;
  $(el[pickAns]).classList.add('picked', right ? 'right' : 'wrong');
  if (!right) $(el[q.answer]).classList.add('right');
  const who = q.answer === 'tie' ? 'Speed tie' : `${(q.answer === 'a' ? q.a : q.b).mon.name} moves first`;
  const col = (c: Card) => `<div><div>${esc(c.mon.name)}</div><div>${alignLabel(c.alignment)}</div><div class="big">${c.speed}</div><ol>${c.steps
    .map((st) => `<li>${esc(st.label)} → ${st.value}</li>`).join('')}</ol></div>`;
  $('result').innerHTML = `<h2 class="${right ? 'ok' : 'no'}">${right ? '✓ Correct' : '✗ Wrong'}: ${esc(who)}${q.field.trickRoom ? ' (Trick Room: slower moves first)' : ''}</h2>
    <div class="cols">${col(q.a)}${col(q.b)}</div><button id="next">Next <kbd>Enter</kbd></button>`;
  $('result').hidden = false;
  $('next').onclick = nextQuestion;
  renderScore();
}

// ---- input ----
for (const id of ['card-a', 'card-b', 'tie']) $(id).addEventListener('click', (e) => {
  if (answered) return nextQuestion();
  answer((e.currentTarget as HTMLElement).dataset.pick as Answer);
});
document.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (answered && (k === 'Enter' || k === ' ')) { e.preventDefault(); return nextQuestion(); }
  const map: Record<string, Answer> = { ArrowLeft: 'a', ArrowRight: 'b', ArrowDown: 'tie', ' ': 'tie' };
  if (map[k]) { e.preventDefault(); answer(map[k]); }
});

// ---- settings ----
const dlg = $<HTMLDialogElement>('settings');
function renderLists() {
  const names = [...Object.keys(builtIn), ...Object.keys(state.custom)];
  $<HTMLSelectElement>('list').innerHTML = names.map((n) => `<option ${n === state.list ? 'selected' : ''}>${esc(n)}</option>`).join('');
}
function renderEffects() {
  $('effects').innerHTML = (Object.keys(EFFECTS) as Effect[]).map((k) =>
    `<label><input type="checkbox" data-effect="${k}" ${state.settings.effects[k] ? 'checked' : ''}> ${EFFECTS[k]}</label>`).join('');
  $<HTMLInputElement>('close').checked = state.settings.close;
}
let draft = new Set<string>();
function renderMons() {
  const term = $<HTMLInputElement>('cl-search').value.trim().toLowerCase();
  const mons = [...base.mons].sort((a, b) => a.name.localeCompare(b.name)).filter((m) => !term || m.name.toLowerCase().includes(term));
  $('cl-mons').innerHTML = mons.map((m) =>
    `<label><input type="checkbox" data-mon="${m.id}" ${draft.has(m.id) ? 'checked' : ''}> ${esc(m.name)} <small>${m.spe}</small></label>`).join('');
  $('cl-count').textContent = `${draft.size} selected`;
}
function loadDraft() {
  const custom = state.custom[state.list];
  $<HTMLInputElement>('cl-name').value = custom ? state.list : '';
  draft = new Set(custom ?? []);
  renderMons();
}
$('open-settings').onclick = () => { renderLists(); renderEffects(); loadDraft(); dlg.showModal(); };
dlg.addEventListener('close', () => { save(); nextQuestion(); });
$('list').onchange = (e) => { state.list = (e.target as HTMLSelectElement).value; loadDraft(); save(); };
$('effects').onchange = (e) => {
  const t = e.target as HTMLInputElement;
  state.settings.effects[t.dataset.effect as Effect] = t.checked;
};
$('close').onchange = (e) => { state.settings.close = (e.target as HTMLInputElement).checked; };
const setAll = (on: boolean) => { for (const k of Object.keys(EFFECTS) as Effect[]) state.settings.effects[k] = on; renderEffects(); };
$('chaos').onclick = () => setAll(true);
$('calm').onclick = () => setAll(false);
$('cl-search').oninput = renderMons;
$('cl-mons').onchange = (e) => {
  const t = e.target as HTMLInputElement;
  t.checked ? draft.add(t.dataset.mon!) : draft.delete(t.dataset.mon!);
  $('cl-count').textContent = `${draft.size} selected`;
};
$('cl-save').onclick = () => {
  const name = $<HTMLInputElement>('cl-name').value.trim();
  if (!name || builtIn[name] || draft.size < 2) return alert('Give the list a new name and pick at least two Pokémon.');
  state.custom[name] = [...draft];
  state.list = name;
  save();
  renderLists();
};
$('cl-delete').onclick = () => {
  if (!state.custom[state.list] || !confirm(`Delete "${state.list}"?`)) return;
  delete state.custom[state.list];
  state.list = 'Meta';
  save();
  renderLists();
  loadDraft();
};
$('data-info').textContent = `Reg M-C · ${usage.teams} Limitless teams · usage updated ${usage.updated.slice(0, 10)} · Meta = top 20% (${META.length} Pokémon)`;

nextQuestion();
