# Stats

> A friendly note: Stats is part of Eurth's 2026 advent calendar. Its door opens on 14 December, so please don't spoil the surprise before then.

Is my nation realistic? Stats is a free plausibility checker for worldbuilders: enter your nation's numbers and see how each compares with real modern countries. It is made by [Eurth](https://eurth.org), a worldbuilding and roleplay community since 2004, as one of its free tools.

The rules every Eurth tool follows are in the handbook, [`node_modules/@eurth/style/HANDBOOK.md`](https://style.eurth.org/handbook/). On anything the tools share, the handbook wins.

## Use

Open the checker and type the numbers you have: population, area, GDP (nominal and PPP), real GDP growth, life expectancy, fertility rate, urban share, capital population, active military, and military and government spending as shares of GDP. Every box is optional, and numbers can be written as people write them: `48,200,000`, `48.2 million`, `1.94 trillion`, `512k`.

Each check shows your value on a range bar among real countries, a verdict, and one sentence of why with a real country for scale:

- **Plausible:** inside the typical band, where nine in ten comparable real countries sit.
- **Stretch:** outside the band, but a real country is further out. It can be done and wants a reason.
- **Unlikely:** beyond every comparable real country today, or not possible at all (a capital larger than its country).

Where a number depends on how rich or how big a country is, your nation is compared with real countries of similar income, population or area. From fertility and life expectancy Stats also draws an estimated population pyramid.

To take a result away: copy the link (it holds every number), the results card or the written description; download the card as PNG, WebP or SVG in six sizes, or the checks as CSV; or save your nation's profile file to carry it to the next Eurth tool. Nothing is stored in the browser.

The pages: the Checker, Examples (eight fictional nations, one for each kind of verdict), the Guide (what makes each number believable), the Glossary, and Data (sources, licences and how the ranges were made).

## The real-world data

The ranges come from a dated snapshot, [`src/data/snapshot.json`](src/data/snapshot.json): the 193 member states of the United Nations, gathered on 14 November 2026. The site never asks another address for anything at run time.

- [World Development Indicators](https://databank.worldbank.org/source/world-development-indicators), The World Bank, licensed under CC BY 4.0: everything except military spending.
- Information from the Stockholm International Peace Research Institute (SIPRI) [Military Expenditure Database](https://www.sipri.org/databases/milex), as published in the World Development Indicators: one year of military spending as a share of GDP, used under SIPRI's fair-use terms.

`npm run snapshot` rebuilds the file from the World Bank's API; commit the result. The Data page prints the sources, licences and attribution from the snapshot itself.

## Development

Node 22.23 or later (CI runs on Node 26).

```sh
npm install          # then commit package-lock.json
npm run dev          # the site while you work
npm run check        # types
npm run build        # the static site, into dist/
npm test             # the engine's tests and the suite's checks (they read dist/, so build first)
npm run axe          # accessibility: every page, both themes
npm run smoke        # the built site in real Chrome: theme, nothing stored, offline
npm run preview      # the built site with its real headers (wrangler dev)
npm run images       # icons and the sharing image, after changing them
npm run snapshot     # refresh the real-world data (about once a year)
```

Where things live:

| What | Where |
| --- | --- |
| The inputs, their units and limits | `src/stats/model.ts` |
| Reading numbers as people type them | `src/stats/parse.ts` |
| Derived numbers: density, GDP per person and so on | `src/stats/derive.ts` |
| The snapshot's types | `src/stats/snapshot.ts` |
| Peers, typical bands and full spreads | `src/stats/ranges.ts` |
| The thirteen checks, the verdict rule, the sentences and the bars | `src/stats/check.ts` |
| The estimated population pyramid | `src/stats/pyramid.ts` |
| The link (`?v=1&p=…`) | `src/stats/link.ts` |
| The profile's `stats` section | `src/stats/profile.ts` |
| The written description, the CSV, the results card | `src/stats/describe.ts`, `csv.ts`, `card.ts` |
| Example nations | `src/stats/examples.ts` |
| The glossary's terms | `src/content/glossary.ts` |
| The checker itself, the range bar and the pyramid | `src/ui/` |
| The pages | `src/pages/` |
| Building the snapshot | `tools/build-snapshot.mjs` |
| The tool's name, address and pages (build time only) | `eurth.config.mjs` |
| The moment the door opens | `LAUNCH_AT` |

The engine in `src/stats/` is plain TypeScript with no page in it: a nation is data, and one function turns it into a report. The checker, the Examples page, the guide's tables, the Data page, the sharing image and the tests all use that one function. Every verdict boundary is tested against the snapshot, with the expected ranges worked out in the test independently of the engine (`tests/boundaries.test.ts`).

## Deployment

The site runs as a Cloudflare Worker serving static assets on its custom domain, `stats.eurth.org` (`wrangler.jsonc`). Until the door opens it isn't deployed anywhere. The launch workflow starts at 22:30 UTC on 13 December 2026, waits for the time in `LAUNCH_AT` and deploys; if it hasn't started by 22:45 UTC, run it by hand from the Actions tab. After that, GitHub Actions deploys every push to `main` that passes, and a nightly run keeps `@eurth/style` and `@eurth/profile` up to date. Deploying uses the organisation secret `CLOUDFLARE_API_TOKEN`.

What's planned, what each release added and what's ruled out is in the [roadmap](roadmap.md). Points from reviews are in the [feedback log](docs/feedback-log.md).

## Licence

Apache 2.0, see [LICENSE](LICENSE). The real-world data keeps its publishers' own licences, listed above and on the Data page.
