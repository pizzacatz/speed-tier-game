# Design audit: Speed Tier Game (2026-10-04)

This audit follows `vibecoding-practices/website-vibecoding-audit-checklist.md`.

## Audit inputs
- **Site:** local `vite preview` build of commit 752f149 (the same code as https://pizzacatz.github.io/speed-tier-game/).
- **Purpose and audience:** VGC players drilling Pokémon Champions Reg M-C speed tiers, often on a phone and often offline.
- **Core tasks:**
  1. Answer "Who moves first?" rounds.
  2. Answer "How fast?" rounds.
  3. Change the list and effects in Settings.
- **Evidence:** source code, plus headless Chrome (Playwright) screenshots at 360×740 and 1280×800 of: the first question, an answered round, How fast? before and after answering, and Settings. No console errors. No assistive-technology testing.
- **Intentional choices:** no animation, minimal UI, sprites from champions-logic.

## 1. Overall assessment
**Uneven with recurring gaps → mostly coherent after fixes.** The core loop is fast and the answer feedback is good. But one CSS root cause broke mode switching: How fast? stacked on top of the two-choice board. The header crowded the mobile view, and some interface details were left over from the first layout (a vertical Tie button, keyboard hints duplicated on touch screens, `alert()` for validation).

## 2. Scope and coverage
- **Checked:** both games, the answer reveal, Settings at 360px and 1280px, keyboard paths (read from the code and run once in the browser), and refresh persistence (read from the code).
- **Not verified:**
  - Screen readers.
  - 768px and 320px widths, and zoom.
  - Installing on a real phone, and offline behaviour on a device.
  - The custom-list editor with many lists.

## 3. What works and should be preserved
- Instant feedback, with the full speed breakdown, after each answer.
- Large tap targets, and both card faces readable at 360px.
- A small colour system that follows the device's light/dark setting.
- Streaks per list survive a reload.
- Answering requires an explicit Enter, so nothing auto-submits.
- No animation, consistent with the product's speed goal.

## 4. Prioritized findings

**F1. Hidden screens still rendered** · I01, I02, T06 · **High / high confidence** · fixed
- **Location:** How fast? tab, all viewports.
- **Evidence:** `before-m360-howfast-answered.png`. The two-choice board and its result showed underneath How fast?.
- **Cause:** author CSS (`main { display: grid }`) overrode the browser's built-in `[hidden] { display: none }` rule.
- **Fix:** a global `[hidden] { display: none !important }`.
- **Acceptance check:** the How fast? screenshot shows only its own card, input and result.

**F2. Header crowded on mobile; the game's location wasn't a URL** · P03, M01, N01, N04–N06, A05 · **Medium / high confidence** · fixed
- **Evidence:** at 360px the mode buttons wrapped onto three lines next to the score. There was no `<h1>`, and the mode wasn't linkable.
- **Fix:**
  - A title row (h1, score and settings) above a full-width two-segment mode switch.
  - The modes are links (`#moves` / `#howfast`) marked with `aria-current`, so Back and Forward switch games.
- **Acceptance check:** opening `…/#howfast` directly loads How fast?.

**F3. Tie control and keyboard hints left over from the first layout** · D09, C03, M05, V04 · **Low / high confidence** · fixed
- **Evidence:** "Tie" was vertical text between the cards on desktop and a full-width row on mobile. Keyboard hints appeared both inside the cards and in a footer, including on touch devices.
- **Fix:**
  - A full-width "Speed tie" button below the cards at every width.
  - One set of key hints, inside the controls they belong to, shown only on devices that can hover.

**F4. Validation used `alert()`** · C08, F06, I04 · **Low / high confidence** · fixed
- **Fix:** an inline error under the list editor that says what to do ("Pick at least two Pokémon.").

**F5. The current list was only visible inside Settings** · P05, U04 · **Low / medium confidence** · fixed
- **Fix:** the "List: Meta · 59 Pokémon" line is now a button that opens Settings.

**F6. Answer result could appear below the fold on mobile** · I08, M01 · **Low / medium confidence** · fixed
- **Fix:** after answering, the result scrolls into view instantly (no smooth scrolling).

**F7. Missing visible focus style** · A03 · **Medium / medium confidence** · fixed
- **Fix:** a single `:focus-visible` outline in the accent colour.

**F8 (clarity). Alignments that don't change Speed showed "×1"** · C06 · **Suggestion** · changed
- These now read "Modest (no Speed change)", which better supports the goal of learning the alignments.

**Open hypotheses** (not verified):
- Settings is long on phones (the custom-list editor sits inline). It might deserve its own screen once people keep many lists.
- How focus behaves in the `<dialog>` with a screen reader.

## 5. Completed checklist
P = Pass, C = Concern (finding ID), NA = Not applicable, NV = Not verified.

| IDs | Status |
|---|---|
| P01 P02 P04 P06 P07 P09 P10 | P |
| P03 | C (F2) |
| P05 | C (F5) |
| P08 | NA (no dashboard or app shell) |
| L01 L02 L03 L04 L05 L07 L08 L10 | P |
| L06 L09 | NA (no hero, single screen) |
| D01 D02 D03 D04 D05 D06 D07 D08 D11 D12 | P |
| D09 | C (F3) |
| D10 | C (F7) |
| V01 V02 V03 V05 V06 V07 V08 V09 V10 | P |
| V04 | C (F3) |
| C01 C02 C04 C05 C07 C09 C10 C11 C12 | P |
| C03 | C (F3) |
| C06 | Suggestion (F8) |
| C08 | C (F4) |
| N01 N04 N05 N06 | C (F2) |
| N02 N09 | P |
| N03 N08 | NA |
| N07 | P (an unknown hash falls back to the last mode) |
| I01 I02 | C (F1) |
| I03 I05 I06 I07 I09 I10 I11 I12 | P |
| I04 | C (F4) |
| I08 | C (F6) |
| F01 F02 F03 F04 F05 F07 F08 F09 | P |
| F06 | C (F4) |
| S03 S04 S08 S10 | P (an empty list explains itself) |
| S01 S02 S05 S06 S07 S09 | NA (no network calls while playing) |
| R01 R02 R04 R05 R09 | P |
| R03 R06 R07 R08 | NA |
| R10 | NA (English only) |
| M02 M03 M07 M08 | P |
| M01 | C (F2, F6) |
| M04 | P |
| M05 | C (F3) |
| M06 M09 M10 | NV |
| A01 A02 A06 A08 A10 A11 A12 | P (keyboard is complete; sprites are decorative with `alt=""`) |
| A03 | C (F7) |
| A04 | NV (native `<dialog>`; Escape works but wasn't tested with a screen reader) |
| A05 | C (F2) |
| A07 A09 | NV |
| U01 U02 U03 U04 U05 U06 U07 U08 | P |
| T01 T02 T03 T04 T05 T07 T08 | P |
| T06 | C (F1) |

## 6. Root causes and correction plan
1. **Implementation slip (F1):** visibility handled with `hidden` but overridden by display rules. **Done:** a global `[hidden]` rule.
2. **Layout grew by adding pieces (F2, F3, F5, F6):** the second mode was bolted onto a header designed for one. **Done:** a title row, a mode switch and a list line. Tie and key hints are now the same at every width.
3. **Incomplete states (F4, F7):** browser default dialogs and focus. **Done:** inline error and a focus style.

**Design contract in place:**
- One radius (10px controls, 12px dialog).
- One border colour.
- Colour roles: accent for focus and field effects, green/red only together with ✓/✗ text.
- A max width of 820px.
- No motion.

## 7. Follow-up verification
- Test installing the app on a phone and launching it in airplane mode.
- Check 320px width and 200% zoom.
- Run a screen-reader pass on the answer announcement (`aria-live` on the result and the score).
