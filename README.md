# Speed Tier Game

**Who moves first?** A speed-tier trainer for Pokémon Champions Reg M-C. It works offline as an installable PWA.

Play: https://pizzacatz.github.io/speed-tier-game/

- Two Pokémon, each with an alignment (nature), Max/Min Speed, item and ability. Answer **left / right / Tie**.
- 80% of sets come from real Limitless M-C team lists and 20% are random.
- Effects have separate toggles: Choice Scarf, Iron Ball, stat stages, Tailwind, Trick Room, paralysis, weather/terrain abilities, Unburden and Quick Feet. **Chaos** turns them all on.
- Close mode keeps both final speeds within 10 of each other. Deliberate ties appear 5% of the time (10% in Chaos).
- Lists: **Meta** (top 20% of unique Pokémon by Limitless usage, Megas counted separately), **All M-C**, and your own custom lists.
- Keys: `←` `→` pick a side, `↓`/`Space` for a tie, `Enter` for the next question.

## Data
- `data/base.json` and `public/sprites/` are built from the local champions-logic repo with `npm run data:base`. They're committed, because CI can't reach that repo.
- `data/usage.json` comes from the Limitless API (`npm run data:usage`). A GitHub Action refreshes it every Monday, commits it, and redeploys.

## Dev
```
npm i
npm run dev
npm test
npm run build
```
Built with vanilla TypeScript, Vite and vite-plugin-pwa. No framework and no animations.
