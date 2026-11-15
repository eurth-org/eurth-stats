# Roadmap

Stats checks whether a fictional nation's numbers are realistic, by comparing them with real modern countries, at stats.eurth.org. It is door 5 of Eurth's 2026 advent calendar and opens on 14 December 2026 at 00:00 Europe/Brussels.

Three parts: what comes next, what each release added (newest first), and what's not planned. Points from reviews are in the [feedback log](docs/feedback-log.md).

## Where to pick up

**15 November 2026.** Version 1 is built and waiting for its door. Every check passes locally: types, the build, 870-odd tests (every verdict boundary against the snapshot, and the suite's contrast, privacy, security-header, no-spoiler, page and launch checks), axe on all pages in both themes (also with results showing), and the smoke test in real Chrome. Nothing is deployed, as the handbook asks.

Still to do before the door:

- **Look at the first CI run on GitHub** (`gh run list -R eurth-org/eurth-stats`): it adds Lighthouse, which hasn't been run locally. The checker's script is about 220 KB before compression, most of it the snapshot; if performance comes in under 95, send the browser a slimmer copy of the snapshot (see Next).
- **A review by Stijn.** Nothing has been reviewed yet, so the feedback log is empty.

For Stijn to decide or pass on:

- **SIPRI's terms.** Military spending is SIPRI's series, which the World Bank republishes under SIPRI's own terms, not CC BY. The snapshot holds one year of one series, with SIPRI's attribution, on the reading that this is inside its fair-use policy (under 10% of a data set, non-commercial, credited). If you'd rather be sure, ask SIPRI, or drop the check: it is one line in `tools/build-snapshot.mjs`.
- **The profile's `stats` section** has seven fields beyond the schema's draft: `gdpPppUsd`, `fertilityRate`, `urbanShare`, `capitalPopulation`, `militarySpendingShare`, `governmentSpendingShare` and `snapshot`. They are valid as extra keys and pass `@eurth/profile`'s checker; Foundations should add them to the schema so it stays the one description of the file.
- **Governmint's budget.** The brief asks that loading a profile reads Governmint's section "so spending shares can be checked", but that section holds no numbers yet. Stats already reads `government.budget.defence` (defence as a percentage of all government spending) if it is there, and shows what it implies as a share of GDP. Governmint, or Foundations, would need to write it.
- **An Examples page** was added to the brief's four pages, because the handbook asks every tool for templates or examples.
- **Government spending** is the World Bank's "Expense (% of GDP)", which is central government only for most countries. The IMF's general-government series would be the better yardstick, but the IMF's site refuses automated requests and its terms ask for permission for them. With permission, it is a small change.
- **The capital check** compares with each real country's largest city (the World Bank's series from the UN), because no open, current series of capital populations was found. So it only ever flags a capital that is too large.

## Next

- **A slimmer snapshot for the browser:** only the metrics the checks use, without sources and series names (those are for the Data page, which is built ahead of time).
- **Earlier eras:** the Cold War, the interwar years and the 1900s, each with its own snapshot from historical data (the Maddison Project for GDP, the UN's and Gapminder's long series for population and life expectancy). The mock-up's Era menu waits for this.
- **A refreshed snapshot each year,** when the World Bank and the UN publish new figures: `npm run snapshot`, read the diff, commit.
- **Governmint's budget,** checked against military and government spending, once the profile carries it.
- **Capital populations** from a proper source, so a capital can be compared with capitals.
- **General-government spending** in place of central government, with the IMF's permission or from another open source.
- **More checks:** energy use, literacy, unemployment, trade as a share of GDP, infant mortality.
- **Results first on a phone:** on a narrow screen the twelve boxes come before the results; a jump link or a sticky summary would help.

## 15 November 2026: 1.0.0, built and waiting for its door

The first version. It goes live when its door opens on 14 December 2026.

- **The checker:** twelve optional numbers, read the way people write them ("48.2 million", "1.94 trillion", "512k"), and thirteen checks that follow the typing: density, GDP per person (nominal and PPP), price level, growth, life expectancy, fertility, urban share, capital share, military per 1,000 people, military spending, spending per soldier and government spending.
- **Verdicts:** Plausible inside the middle 90% of comparable real countries, Stretch outside it but no further out than a real country, Unlikely beyond them all or impossible. Always a word and an icon, with three different shapes.
- **Peers:** real countries in four equal groups by GDP per person, population or land area, so a number is judged against countries like the nation.
- **One sentence of why** for each check, with a real country for scale ("About the same as Spain."); countries are named, never judged.
- **Range bars** with the typical band, the full spread and the nation's marker, which slides into place.
- **For scale:** population, area and GDP each beside a real country of about the same size, with no verdict.
- **Numbers that can't be true together** are caught: a capital larger than its country or its towns, more soldiers than people, a military that outspends its government.
- **An estimated population pyramid** from fertility and life expectancy, fitted to real countries.
- **The snapshot:** the 193 member states of the United Nations, from the World Bank's World Development Indicators (CC BY 4.0) and SIPRI, gathered on 14 November 2026 and saved in the repo. No requests at run time.
- **Saving:** the nation in its link (`?v=1&p=…`, versioned), and in the profile's `stats` section, which leaves every other section alone and reads Governmint's.
- **Exports:** a results card in six sizes as PNG, WebP or SVG, a CSV of the checks, Copy link, Copy picture, Copy description and the Share dialog.
- **Pages:** Checker, Examples (eight fictional nations), Guide, Glossary (42 terms) and Data (sources, licences, method and every range).
- **Easter egg:** a population of exactly 1 gets "A nation of one. Bold."
- **From the suite:** the shell, the themes, offline use, install, the security headers and the launch workflow, all from `@eurth/style` 1.1.0.

## Not planned

- **Requests at run time.** The ranges come from the snapshot in the repo; the site never asks another address for anything.
- **Judging real countries.** They are named for scale, never ranked or graded.
- **A score out of 100.** Three words and a reason say more than a number, and a single score invites gaming it.
- **Verdicts on size.** A big or a small nation is a choice about the story, so population, area and GDP only get a country to picture them by.
- **A "Check my nation" button.** The mock-up had one; results follow the typing instead, as in the other tools.
- **Browser storage or accounts.** A nation lives in its link or its profile file; nothing is stored.
