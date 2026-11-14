You're building Stats (stats.eurth.org), a plausibility checker that tells worldbuilders whether their nation's numbers are realistic, one of Eurth's free worldbuilding tools. Eurth (eurth.org) is a worldbuilding and roleplay community since 2004, with a hard modern-tech realism framework. The attached repo is eurth-org/eurth-stats.

Working order (Foundations and many other tools are being built at the same time tonight):
1. Save this brief as CLAUDE.md.
2. If the repo named above doesn't exist on GitHub yet, create it as a public, empty repo in eurth-org with the gh CLI and connect this folder; if you can't, ask me.
3. Read what already exists of github.com/eurth-org/eurth-style (HANDBOOK.md) and github.com/eurth-org/eurth-profile; they may still be in progress. Write the plan and show it to me.
4. Build the tool's core logic as plain TypeScript modules with thorough tests, and its content and data (guide text, presets, examples, data snapshots). None of that needs eurth-style.
5. Only once @eurth/style 1.0.0 is released (check the releases of github.com/eurth-org/eurth-style), start the site from its starter template and carry on to the end of this brief. Until then, don't scaffold the site, pages or styles.
6. Commit and push after every finished step, and keep roadmap.md up to date with exactly where to pick up, so a new session can continue if this one stops.

Background for every step: Read HANDBOOK.md in github.com/eurth-org/eurth-style and start from its starter template; read the profile schema in github.com/eurth-org/eurth-profile; look at github.com/eurth-org/eurth-flag, the reference build. The handbook wins over this brief on everything shared. Then write a plan and show it to me before you build.

Mock-up: the "stats.eurth.org, plausibility checker" board on https://claude.ai/artifact/32RKDdVTtCfHsL6Qc6LxV6.

Pages: Checker, Guide, Glossary, Data (the sources and how the ranges were made).

The checker, v1
- Inputs: population, area, GDP (nominal and PPP), real GDP growth, life expectancy, fertility rate, urban share, capital population, active military, military spending as a share of GDP, government spending as a share of GDP. All optional; units shown.
- Derived: density, GDP per person, military per 1,000 people, capital share and so on.
- Each check: the value, a range bar showing where real modern countries sit (typical band and full spread) with the user's value marked, a verdict as a word and an icon (Plausible, Stretch, Unlikely), and one sentence of why with a real-world comparison ("about the same as Spain").
- A summary line ("4 plausible, 1 stretch, 1 unlikely") and an estimated population pyramid from fertility and life expectancy.
- v1 is the modern era only. Earlier eras go on the roadmap.

Data
- Real-world ranges built at build time from open datasets (World Bank Open Data, UN World Population Prospects or similar), saved as a dated snapshot in the repo, with licences and attribution on the Data page. No requests at runtime.
- Comparisons only ever name real countries for scale, never judge them.

Profile section "stats": the inputs and the snapshot date. Loading a profile also reads Governmint's government section, so spending shares can be checked.

Exports: a results card image (1200 x 630 and square), Copy description, CSV of the checks.

Signature touch: the marker slides into place on each range bar. Easter egg: a population of exactly 1 gets "A nation of one. Bold."

Done when the handbook's checklist passes and every verdict boundary is unit-tested against the snapshot.
