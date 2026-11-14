# Roadmap

Stats checks whether a fictional nation's numbers are realistic, by comparing them with real modern countries, at stats.eurth.org. It is door 5 of Eurth's 2026 advent calendar and opens on 14 December 2026 at 00:00 Europe/Brussels.

Three parts: what comes next, what each release added (newest first), and what's not planned.

## Where to pick up

**14 November 2026.** The brief is saved, the repository exists, and this plan is written. Next: Phase 1, step 1.

Waiting on others:

- **@eurth/style 1.0.0** is not released (no HANDBOOK.md, starter template or tag on GitHub yet). Phase 2 can't start until it is: check `gh release list -R eurth-org/eurth-style`. Until then, no site, pages or styles.
- **@eurth/profile 1.0.0** is not released. Its draft `stats` section has six fields: `population`, `areaKm2`, `gdpUsd`, `gdpGrowth`, `lifeExpectancy` and `activeMilitary`. Stats needs seven more, which the schema allows as extra keys (see Phase 1, step 8). Ask Foundations to document them.
- **Governmint's `government` section** holds no numbers yet (form, heads and legislature only). Governmint's own model has a budget: ten shares of all government spending, defence among them. Once that section carries the budget, Stats can check it against military and government spending. Until then Stats reads the section and uses what is there.

## Next

### Phase 1: the data, the engine and the words (needs nothing from @eurth/style)

Plain TypeScript in `src/stats/`, tests in `tests/`, as Flagwright keeps its engine in `src/flag/`. Only TypeScript and Vitest are installed. Commit and push after each step.

1. **The snapshot** (`tools/build-snapshot.mjs`, `src/data/snapshot.json`): a script that fetches the open datasets once, at build time, and writes one dated file. The site never asks for anything at run time.
   - World Bank Open Data (CC BY 4.0) for population, land area, GDP (nominal and PPP), real GDP growth, life expectancy, fertility, urban share, armed forces personnel and, for a model check, the shares of people under 15 and over 64.
   - Capital city populations, military spending and general government spending come from other publishers (UN World Urbanization Prospects, SIPRI, the IMF). Their licences are read before anything is saved; if one doesn't allow a copy in a public repo, that check uses a source that does, or waits.
   - Sovereign states only (the World Bank's aggregates such as "World" and "Euro area" are dropped). Each number keeps its year. Growth is a ten-year average, so one odd year doesn't set the range.
   - The file records its date, every source, the indicator codes, the licences and the attribution lines the Data page will show.
2. **Model** (`model.ts`): the eleven inputs, all optional, each with a unit and sane limits; everything that arrives from a link or a file is checked and clamped.
3. **Reading numbers** (`parse.ts`): "48,200,000", "48.2 million", "1.94 trillion", "6.5% a year" and "512k" all work; nonsense gives a plain message, never a wrong number.
4. **Derived numbers** (`derive.ts`): density, GDP per person (nominal and PPP), the price level (PPP against nominal), military per 1,000 people, military spending per soldier, capital share of the population and of the urban population, government spending per person.
5. **Ranges** (`ranges.ts`): for each check, the real countries it is compared with, their typical band and their full spread.
   - Peers: where a number depends on how rich or how big a country is, the comparison is with similar countries. Growth, life expectancy, fertility, urban share, the price level and spending are compared with countries of similar income; capital share and density with countries of similar size. With too little to go on, the comparison is with every country.
   - Typical band: the middle 90% of those countries. Full spread: the lowest to the highest.
6. **Verdicts** (`check.ts`): one pure function from the inputs to a list of checks.
   - Plausible: inside the typical band. Stretch: outside it, but a real country is out there too. Unlikely: beyond every real country of that kind, or impossible (more people in the capital than in the country).
   - Each check carries its value, where it sits on the bar, the verdict and one sentence of why with a real country for scale ("about the same as Spain"). Countries are named for scale only; the sentences never judge them.
   - Every boundary is tested against the snapshot: a value just inside and just outside each band and each spread, for every check and every peer group.
   - The summary line ("4 plausible, 1 stretch, 1 unlikely"), and the easter egg's trigger: a population of exactly 1.
7. **Population pyramid** (`pyramid.ts`): an estimate from fertility and life expectancy alone. A model life table fitted to the life expectancy, and a stable population growing at the rate the fertility implies, give the share of men and women in each ten-year band. Tested against real countries' shares of young and old in the snapshot, and labelled as an estimate: it knows nothing of wars, baby booms or migration.
8. **Saving** (`link.ts`, `profile.ts`): the inputs and the nation's name, compact and versioned, in the link's query string; and the profile's `stats` section: the six drafted fields plus `gdpPppUsd`, `fertilityRate`, `urbanShare`, `capitalPopulation`, `militarySpendingShare`, `governmentSpendingShare` and `snapshot` (the snapshot's date). Loading a profile also reads `identity` for the name and `government` for what it holds. Every other section and every unknown key is left alone.
9. **Exports** (`describe.ts`, `csv.ts`, `card.ts`): the written description for Copy description and screen readers; a CSV of the checks; the results card as an SVG string in two sizes (1200 x 630 and square), with colours passed in as a palette so the site can hand it @eurth/style's tokens.
10. **Examples** (`examples.ts`): fictional nations that show each verdict, starting with the mock-up's Republic of Teland and the profile examples' Calderwyn and Vantmoor.
11. **Guide, glossary and Data page text** (`src/content/`): how to read each number and what makes it believable, with sources and a last-updated date; a glossary of about 40 terms (nominal and PPP, real growth, fertility rate, dependency ratio and so on); and the Data page: every source, its licence and attribution, the snapshot date, and how the bands were made.

### Phase 2: the site (only once @eurth/style 1.0.0 is released)

12. Start from the starter template in eurth-style; read HANDBOOK.md first, and where it differs from this plan, the handbook wins.
13. Pages: Checker, Guide, Glossary and Data, with titles, descriptions, canonical links, JSON-LD, sitemap.xml, robots.txt, llms.txt and Open Graph images.
14. The checker, as a Svelte 5 island: the inputs with their units, results that update as you type, a range bar per check (typical band, full spread, your marker), the verdict as a word and an icon with shapes that differ, never colour alone, the summary line and the pyramid.
15. Save and load: the link, and the profile file (file picker and drag and drop, from @eurth/profile).
16. Exports: the results card as PNG in both sizes, CSV, Copy link, Copy picture, Copy description, and the Share dialog.
17. Delight: the marker slides into place on each range bar; the toast "A nation of one. Bold." for a population of exactly 1; the suite's own touches from @eurth/style.
18. Offline, install, security headers, axe and Lighthouse checks, as the handbook asks.
19. CI, and the launch workflow: `LAUNCH_AT` is `2026-12-14T00:00:00+01:00`, the scheduled run starts at 22:30 UTC on 13 December, and it also runs by hand. No custom domain and no workers.dev deploy before then.
20. README (use, development, deployment), docs/feedback-log.md, and the handbook's checklist.

### Where the mock-up and the brief differ

The brief wins, and the handbook wins over both.

- The mock-up's first page is "Maker"; the brief calls it "Checker" and adds a Data page.
- The mock-up has an Era menu (Cold War, Interwar, 1900s). Version 1 is the modern era only, so there is no menu.
- The mock-up has seven inputs; the brief has eleven (it adds GDP at PPP, fertility, urban share, and military and government spending).
- The mock-up has a "Check my nation" button. Results update as you type instead, like the other tools.
- "Add to country card" in the mock-up is the profile's "Save profile" button.

### After launch

- **Earlier eras:** the Cold War, the interwar years and the 1900s, each with its own snapshot from historical data (the Maddison Project for GDP, the UN's and Gapminder's long series for population and life expectancy).
- **A refreshed snapshot each year,** when the World Bank and the UN publish new figures.
- **Governmint's budget,** checked against military and government spending, once the profile carries it.
- **More checks:** energy use, literacy, unemployment, trade as a share of GDP.

## Releases

None yet.

## Not planned

- **Requests at run time.** The ranges come from the snapshot in the repo; the site never asks another address for anything.
- **Judging real countries.** They are named for scale, never ranked or graded.
- **A score out of 100.** Three words and a reason say more than a number, and a single score invites gaming it.
- **Accounts, or nations kept on a server.** A nation lives in its link or its profile file; nothing is stored.
