// What this tool is called and where it lives. Read at build time only: astro.config.mjs, the
// frontmatter of .astro pages, tests and tools/. Never import this from a Svelte component or a
// <script>: it pulls in the list of every Eurth tool, and browser code must not carry that
// (HANDBOOK.md, Launch). Hand the component what it needs as props instead.
import { defineSite } from '@eurth/style/build';

export const site = defineSite({
  // The subdomain, and the tool's id in @eurth/style's tools.json.
  id: 'stats',
  name: 'Stats',
  url: 'https://stats.eurth.org',
  // "<Name>: free online <thing> maker for worldbuilders"
  title: 'Stats: free online plausibility checker for worldbuilders',
  description:
    'A free plausibility checker for worldbuilders: enter your nation’s population, area, GDP and more, and see how each number compares with real countries. No account needed.',
  tagline: 'Is my nation realistic?',
  pages: [
    { href: '/', label: 'Checker' },
    { href: '/examples/', label: 'Examples' },
    { href: '/guide/', label: 'Guide' },
    { href: '/glossary/', label: 'Glossary' },
    { href: '/data/', label: 'Data' },
  ],
  repo: 'https://github.com/eurth-org/eurth-stats',
  category: 'UtilitiesApplication',
  ogAlt:
    'Stats, the plausibility checker by Eurth, at stats.eurth.org: the Eurth yurt beside six range bars, four marked plausible with a tick and two marked a stretch with a warning sign.',
  llms: [
    '## What Stats does',
    '',
    '- Compares a fictional nation’s numbers (population, area, GDP, growth, life expectancy, fertility, urban share, capital, military and spending) with real modern countries.',
    '- Each check gets a verdict: Plausible (inside the middle 90% of comparable real countries), Stretch (outside it, but a real country is further out) or Unlikely (beyond every comparable real country, or impossible).',
    '- The real-world ranges come from a dated snapshot of open data (World Bank World Development Indicators, CC BY 4.0; SIPRI for military spending). The Data page lists every source.',
    '- A nation lives in its link: every number is in the query string, so a link can be shared and opened again.',
  ].join('\n'),
});
