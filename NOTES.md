# Speed Tier Game: Discovery Notes

Goal: build our own version of https://justmovefirst.com/ (a VGC speed-tier trainer) and work in feedback from r/VGC thread 1wvcpkk.

## What the original does (reverse-engineered from its JS bundle, 2026-10-03)

**Stack:** React + MUI, built with Vite/rolldown, React Router. Google Identity sign-in, a backend for the leaderboard, localStorage for streaks and decks. Ships in 6 languages (en/de/fr/es/it/fi). Footer says "made by tom".

**Routes / modes**
- `/` **Flashcards**: tap the card to reveal the Pokémon's base Speed, then "Next Pokemon".
- `/faster` **Who's Faster?**: two Pokémon, pick the one with the higher base Speed.
  - **Hard** toggle: only close matchups (within 10 Speed), no ties.
- `/howfast` **How Fast?**: type in the base Speed (number input + Submit).
  - Toggles: Base Speed vs **Max Speed**, and **Natures** (+Spe / Neutral).
- `/leaderboard`: one board per mode/variant (with prev/next arrows), showing Player and Streak.

**Scoring:** streak and best streak, plus a time display. Streaks are tracked per deck and per mode.
- **Practice** vs **Ranked**. Ranked needs sign-in and always uses the Champions deck.
- Popups for a new PB, making the top 10, or becoming #1 (the #1 popup quotes the anime theme).

**Decks (Pokémon pools)**
- Built-in decks: **Champions** (every Pokémon legal in Pokémon Champions, most used first), **All Pokemon**, and **Meta** (top 50 by tournament usage).
- Custom decks: search plus type filters, then save. Export/import as JSON `{name, pokemonIds[]}`.
- Usage data comes from the Limitless tournament API (Reg M-C, 177 events, 8786 teams) plus pokedata.ovh.

**Account:** Google sign-in, display name (3–20 characters, letters/numbers/-/_), profanity filter, one rename per week.

**Theme:** light/dark/system. Monochrome zinc palette with a red accent.

## Reddit feedback (~120 comments, fetched through the thread's RSS feed)

**Author's notes on how it's built:** stats and sprites come from PokeAPI (GraphQL); the Champions legal list comes from Showdown `data/mods/champions/formats-data.ts`; usage data comes from Limitless + pokedata. Built with React/TS + MUI, hosted on Cloudflare Workers (free tier). Ranked is *timed*. Ties count as correct on purpose (there's no tie button). Meta = top 50 plus the base forms of megas. An "All Pokemon" deck was added after the post.

### Feature requests (most-requested first)
1. **Field effects / modifiers** (many people asked): Tailwind, Trick Room, ±1/+2 stages, Choice Scarf, weather abilities (Swift Swim, Chlorophyll), Unburden, Speed Boost, Dragon Dance. One commenter: "it boils down to stat stages, since the multipliers are ×2 or ×1.5." Another wants **false positives**, e.g. a regular Swampert in rain.
2. **Real lv50 stats / SP investment**: "Mega Zard Y with 0 SP neutral vs 32 SP +Spe." Common meta spreads (Pikalytics, game usage data). Adamant vs Jolly Sneasler.
3. **Realistic natures for meta mons**: Jolly Rillaboom and Timid Armarouge make no sense. Use the most common nature and spread from usage data.
4. **Uncertainty mode**: "90% Jolly", and you have to guess like on ladder ("Will Gholdengo outspeed my Rillaboom?").
5. **Usage-weighted random picks**, so important matchups come up more often.
6. **Tie button** (asked 3×). Speed ties included in Hard mode.
7. **A difficulty between Normal and Hard** (e.g. within 20 Speed).
8. **How Fast? approximation scoring**: closeness score / within-range easy mode (like magnitudle).
9. **How Fast? auto-submits** before the user presses enter. Annoying, make it explicit.
10. **Show base speeds after answering** in Natures mode, especially when wrong.
11. **Faster number animation.**
12. **Other stats** besides Speed.
13. **Team mode**: pick your own team and drill its matchups. "2v2 with stat points."
14. Decks: per-regulation rosters, National Dex vs current reg. (Mostly already exists.)
15. Dark mode by default ("elite").

### Bugs / complaints
- Leaving the tab reset the practice streak. Practice state should persist.
- A streak set before signing up didn't count on the leaderboard (practice ≠ ranked; it's confusing UX).
- HTTPS wasn't enforced at first.
- Ties being marked "correct" confused people.

### Players' insights (good for design)
- People guess from how fast a mon "feels" (its usual items and spreads) rather than its base stat. Basculegion and Rotom-Mow are good examples. Being able to tell base speed apart from how fast a mon really plays is the skill worth training.
- Common streak-killers: Emolga vs Pidgeot, Clawitzer vs Eelektross, Mega Absol, Aromatisse, Eternal Floette, Meowstic-Mega vs Delphox-Mega.
- Strong mobile and commute use ("playing on the train"), and it spread through a Polish Discord. It needs to be fast and mobile-first.

## Open questions
See the chat. Answers go below once decided.

## Decisions (2026-10-03)
- **Scope:** our own take, not a clone. v1 is the "Who's Faster?" game *with a Tie button*.
- **Feel:** extremely fast, **no animations** anywhere.
- **No accounts.** Static site, installable PWA, fully offline (for planes).
- **Mixed tiers:** items, field effects, weather, stages, etc. Every Pokémon is level 50 (Champions), so the stat formula is `floor((base+20+SP) × alignment)`, then modifiers. Speed resolution must match the champions-logic `speed_order` order: stage → ability multiplier → Scarf → Tailwind → paralysis, flooring after each step, with Trick Room flipping the order.
- **Format:** Pokémon Champions **Reg M-C only**. Data comes from champions-logic (`/home/nuc1/Documents/Coding Projects/champions_logic/data/champions_logic.db`).
- **Meta deck:** Limitless VGC usage, taking the **top 20% of unique Pokémon** seen (not a fixed top 50).
- **Hosting:** GitHub Pages.
- **Input:** big tap targets plus keyboard shortcuts.
- **English only.**
- **Sprites** come from champions-logic `sprites/menu/*.png` (393 files, 6.2 MB). Shrink them for the offline cache.
- **After each answer, show both final speeds.**
- **v1.1:** a "most-missed" breakdown.

## Proposed stack
Vanilla TypeScript + Vite (no framework), plus `vite-plugin-pwa` for the service worker.
- A build-time script reads the champions-logic SQLite DB and the Limitless API, writes `data.json`, and converts sprites to a WebP sheet.
- State (streaks, settings, decks, and later the miss log) lives in localStorage.

## Decisions round 2 (2026-10-03)
- **Alignment display:** only `+Spe` / `Neutral` / `−Spe`.
- **Sets and effects: 80% real / 20% random.** "Real" sets are sampled from Limitless M-C team lists; random sets test the player on unlikely setups.
- **Effects:** every Speed effect that's legal in Champions (check each against champions-logic), sampled the same 80/20 way, with **one on/off toggle per effect**.
- **The whole site asks "Who moves first?"** with A / B / Tie. Trick Room just flips the answer.
- **Close mode:** a toggle that only shows pairs whose final speeds are within 10 of each other.
- **Meta list:** top 20% of unique Pokémon, with Megas counted separately but always included.
- **Lists:** Meta, All M-C, and user-made **custom lists** (the word is "lists", not "decks").
- **Sprites:** official sprites from champions-logic are OK for a personal GitHub Pages site.

## Limitless API findings
- `GET play.limitlesstcg.com/api/tournaments?game=VGC` lists tournaments, but filter on `format == "M-C"` because the names can lie (a "M-C" weekly was tagged M-B).
- `GET /api/tournaments/{id}/standings` returns `decklist[]` entries of `{id, name, item, ability, attacks[4], nature}`.
  - **nature** uses mainline names (Quiet, Brave…). Map them to +Spe / neutral / −Spe.
  - **No SP / EV data**, so the speed SP has to be inferred (open question).
  - **attacks** shows who carries Tailwind, Trick Room, Dragon Dance, Icy Wind, etc., which gives realistic effect frequencies.
  - Megas are flagged only by the Mega Stone item, so derive the Mega form from that item.

## Decisions round 3 (2026-10-03)
- **Show the alignment name in full**, including alignments that don't touch Speed, e.g. `Adamant (+Atk −SpA)`, so the player learns what every alignment does. (This replaces "only +Spe/Neutral/−Spe".) Champions has 21 alignments and only **Serious** is neutral. Map mainline-only neutral natures from Limitless (Hardy, Docile, Bashful, Quirky) to Serious. Get the multipliers from the champions-logic `stat_alignment` tool, never from memory.
- **Speed SP:** show it as **Max Speed** (32 SP) or **Min Speed** (0 SP). The card shows the stat after SP but before the alignment, e.g. "Max Speed: 154". Max vs Min is rolled **independently of the alignment** (75% Max / 25% Min), so the card never gives away the alignment. The alignment's effects only appear in the answer reveal.
- **Tailwind:** active **5%** of the time for *any* Pokémon. **Trick Room:** active in **5%** of questions. Neither depends on the moveset.
- **Scoring:** streak + best only, no timer.
- **Deliberate ties:** 5% of questions, raised to **10% in Chaos** (all toggles on). The game builds the tie from any mix of alignment / item / field / stage changes.
- **Keyboard:** ← left, → right, ↓ or Space for Tie, Enter for next.
- **A GitHub Action** rebuilds the data weekly from Limitless and deploys to Pages.
- **Repo:** `speed-tier-game` → `<user>.github.io/speed-tier-game`.
