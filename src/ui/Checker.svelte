<script lang="ts">
  /*
   * The checker: one Svelte component, woken up on the start page.
   *   - The nation lives in the link (?v=1&p=…): read safely on arrival, kept in step after.
   *   - Nothing is stored: "save" is the link, a picture, a CSV or the nation's profile file.
   *   - Results follow the numbers as they are typed; there is no button to press.
   *   - Every verdict is a word and an icon, and the whole result has a written description.
   *   - Only tokens and eu- classes: no colour, font or spacing of its own.
   * All the sums are in src/stats/, which knows nothing of the page.
   */
  import { faDice, faDownload, faFileCsv, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
  import { createProfile, getSection, setSection, type EurthProfile } from '@eurth/profile';
  import ProfileButtons from '@eurth/profile/ProfileButtons.svelte';
  import { PICTURE_SIZES, download, fileSlug, markdownText, niceWatcher, svgToPicture, toast } from '@eurth/style';
  import Icon from '@eurth/style/components/Icon.svelte';
  import ShareButtons from '@eurth/style/components/ShareButtons.svelte';
  import { onMount } from 'svelte';
  import { VERDICT_ICON, cardSvg } from '../stats/card';
  import { VERDICTS, VERDICT_WORD, checkNation } from '../stats/check';
  import { checksCsv } from '../stats/csv';
  import { describeNation, shortDescription, titleOf } from '../stats/describe';
  import { EXAMPLES } from '../stats/examples';
  import { editable, percent } from '../stats/format';
  import { decodeLink, nationUrl } from '../stats/link';
  import { INPUTS, NAME_MAX, cleanName, countInputs, type InputKey, type Inputs, type Nation } from '../stats/model';
  import { parseInput } from '../stats/parse';
  import { fromProfile, impliedMilitarySpending, toStatsSection, withStatsSection, type GovernmentRead } from '../stats/profile';
  import { dateInWords } from '../stats/snapshot';
  import PyramidChart from './PyramidChart.svelte';
  import RangeBar from './RangeBar.svelte';

  // Passed in by the page: browser code never imports eurth.config.mjs (see the note there).
  let { siteName, siteUrl }: { siteName: string; siteUrl: string } = $props();

  const blank = (): Record<InputKey, string> => Object.fromEntries(INPUTS.map((spec) => [spec.key, ''])) as Record<InputKey, string>;

  let name = $state('');
  let texts = $state(blank());
  let profile = $state<EurthProfile | null>(null);
  let government = $state<GovernmentRead | null>(null);
  let ready = $state(false);
  let size = $state<(typeof PICTURE_SIZES)[number]['id']>('preview');
  let format = $state<'png' | 'webp' | 'svg'>('png');
  const fields: Partial<Record<InputKey, HTMLInputElement>> = $state({});

  // What was typed, read the way people write numbers; anything unclear is refused with a reason.
  const read = $derived(INPUTS.map((spec) => ({ spec, result: parseInput(spec.key, texts[spec.key]) })));
  const inputs = $derived(
    Object.fromEntries(read.flatMap(({ spec, result }) => (result.ok ? [[spec.key, result.value]] : []))) as Inputs,
  );
  const nation = $derived<Nation>({ name: cleanName(name), inputs });
  const report = $derived(checkNation(inputs));
  const title = $derived(titleOf(nation));
  const description = $derived(describeNation(nation, report));
  const host = $derived(new URL(siteUrl).host);
  // Before the page has loaded there is no address to read: the site's own, then.
  const link = $derived(nationUrl(ready ? `${location.origin}${location.pathname}` : `${siteUrl}/`, nation));
  const slug = $derived(fileSlug(nation.name, 'nation'));
  const implied = $derived(impliedMilitarySpending(inputs, government ?? undefined));

  function show(next: Nation) {
    name = next.name;
    const filled = blank();
    for (const spec of INPUTS) {
      const value = next.inputs[spec.key];
      if (value !== undefined) filled[spec.key] = editable(value);
    }
    texts = filled;
  }

  onMount(() => {
    // A link is someone else's input: decodeLink never throws, and every value is checked.
    const arrived = decodeLink(location.search);
    if (!arrived.empty) show(arrived.nation);
    if (arrived.newer) toast('That link comes from a newer Stats. It has read what it could.');
    ready = true;
  });

  // The address bar follows the numbers, so the link can be copied from there too. It waits for
  // a pause in the typing: browsers allow only so many address changes a second.
  $effect(() => {
    const address = link;
    if (!ready) return;
    const timer = setTimeout(() => history.replaceState(history.state, '', address), 300);
    return () => clearTimeout(timer);
  });

  // This tool's easter egg: a population of exactly 1.
  let told = false;
  $effect(() => {
    if (!ready) return;
    if (report.nationOfOne && !told) toast('A nation of one. Bold.');
    told = report.nationOfOne;
  });

  // The suite's wink: "Nice." when a number settles on 69.
  const watchLife = niceWatcher();
  const watchUrban = niceWatcher();
  $effect(() => watchLife(inputs.lifeExpectancy ?? Number.NaN, () => fields.lifeExpectancy));
  $effect(() => watchUrban(inputs.urbanShare ?? Number.NaN, () => fields.urbanShare));

  let turn = 0;
  function example() {
    const next = EXAMPLES[turn++ % EXAMPLES.length];
    if (!next) return;
    show(next.nation);
    toast(`${next.nation.name}: an example to take apart.`);
  }

  function startAgain() {
    show({ name: '', inputs: {} });
    government = null;
    toast('A blank slate.');
  }

  function loaded(next: EurthProfile) {
    profile = next;
    const found = fromProfile(next);
    government = found.government ?? null;
    if (found.found) show(found.nation);
    else if (found.nation.name !== '') name = found.nation.name;
    const who = found.nation.name || 'Your nation';
    toast(found.found ? `${who} is loaded.` : `${who} is loaded. It has no numbers yet: add some and save it again.`);
  }

  // What "Save profile" writes: the stats section and nothing else. Every other section, and any
  // key in ours that this version doesn't know, is carried over as it was.
  const saved = $derived.by(() => {
    if (countInputs(inputs) === 0) return profile;
    const base = profile ?? createProfile(nation.name || 'Unnamed nation');
    const section = toStatsSection(nation, report, new Date(), link);
    const merged = withStatsSection({ stats: getSection(base, 'stats') }, section).stats;
    return setSection(base, 'stats', merged as never);
  });

  const card = (width: number, height: number): string => cardSvg(nation, report, { width, height, host });

  async function downloadCard() {
    const chosen = PICTURE_SIZES.find((entry) => entry.id === size) ?? PICTURE_SIZES[0];
    const svg = card(chosen.width, chosen.height);
    const file = `${slug}-stats-${chosen.width}x${chosen.height}`;
    if (format === 'svg') download(svg, `${file}.svg`, 'image/svg+xml');
    else download(await svgToPicture(svg, { width: chosen.width, height: chosen.height, type: `image/${format}` }), `${file}.${format}`);
    toast('The card is yours.');
  }

  function downloadCsv() {
    download(checksCsv(report), `${slug}-stats.csv`, 'text/csv');
    toast('The checks, as a spreadsheet.');
  }

  // The forum topic: the name is typed by a visitor, so Markdown must read it literally.
  const forumBody = $derived(
    [
      `**${markdownText(title)}**, checked with [${siteName}](${link}): ${report.summary}.`,
      '',
      ...report.checks.map((check) => `- **${VERDICT_WORD[check.verdict]}**: ${check.label}, ${check.valueText}. ${check.reason}`),
    ].join('\n'),
  );
</script>

<div class="checker">
  <form class="eu-card controls" novalidate onsubmit={(event) => event.preventDefault()}>
    <div class="eu-row">
      <button type="button" class="eu-btn" data-click="tumble" onclick={example}><Icon icon={faDice} /> Example</button>
      <button type="button" class="eu-btn" data-click="spin" onclick={startAgain}><Icon icon={faRotateLeft} /> Start again</button>
    </div>

    <label class="eu-field">
      <span class="eu-label">Nation</span>
      <input class="eu-input" bind:value={name} maxlength={NAME_MAX} autocomplete="off" placeholder="Your nation’s name" />
    </label>

    <div class="grid">
      {#each read as { spec, result } (spec.key)}
        {@const wrong = !result.ok && !result.empty}
        <div class="eu-field">
          <label class="eu-label" for="in-{spec.key}">{spec.label} <span class="unit">({spec.unitLabel})</span></label>
          <input
            id="in-{spec.key}"
            class="eu-input eu-input--data"
            bind:this={fields[spec.key]}
            bind:value={texts[spec.key]}
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            aria-invalid={wrong ? 'true' : undefined}
            aria-describedby="{wrong ? `error-${spec.key} ` : ''}help-{spec.key}"
          />
          {#if wrong}
            <span class="eu-error" id="error-{spec.key}" role="alert">{result.message}</span>
          {/if}
          <span class="eu-help" id="help-{spec.key}">{spec.hint}</span>
        </div>
      {/each}
    </div>
    <p class="eu-help">Every box is optional. Write numbers as you like: 48,200,000, 48.2 million, 1.94 trillion or 512k.</p>
  </form>

  <section class="eu-card results" aria-labelledby="results-title">
    <header class="top">
      <h2 id="results-title">{title}</h2>
      <p class="summary" aria-live="polite" aria-atomic="true">
        {#if report.checks.length === 0}
          <span class="eu-muted">{report.summary}</span>
        {:else}
          {#each VERDICTS as verdict (verdict)}
            {#if report.counts[verdict] > 0}
              <span class="verdict {verdict}"><Icon icon={VERDICT_ICON[verdict]} /> {report.counts[verdict]} {VERDICT_WORD[verdict].toLowerCase()}</span>
            {/if}
          {/each}
        {/if}
      </p>
    </header>

    {#if report.checks.length === 0 && report.scale.length === 0}
      <p class="eu-muted">
        Enter two or three numbers and the checks appear here: population and area give density, population and GDP give GDP per person, and so on. Or press
        Example to see a nation taken apart.
      </p>
      <noscript><p class="eu-muted">The checker needs JavaScript to do its sums. The guide, the glossary and the data page read fine without it.</p></noscript>
    {/if}

    {#if report.scale.length > 0}
      <div class="part">
        <h3>For scale</h3>
        <ul class="scale">
          {#each report.scale as line (line.id)}
            <li>
              <span class="what">{line.label} <span class="eu-data">{line.valueText}</span></span>
              <span class="eu-muted">{line.comparison}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if report.checks.length > 0}
      <div class="part">
        <h3>Checks</h3>
        <ul class="checks">
          {#each report.checks as check (check.id)}
            <li class="check">
              <div class="words">
                <span class="what">{check.label} <span class="eu-data">{check.valueText}</span></span>
                <span class="eu-muted">{check.reason}</span>
              </div>
              <RangeBar {check} />
              <span class="verdict {check.verdict}"><Icon icon={VERDICT_ICON[check.verdict]} /> {check.verdictWord}</span>
              <details class="more">
                <summary>Details<span class="eu-visually-hidden"> of {check.label.toLowerCase()}</span></summary>
                <p>
                  {check.what} Compared with {check.peers}
                  {check.groupLabel}: {check.typical.text} is typical. The lowest is {check.spread.lowest.name}, at {check.spread.lowest.valueText}; the highest is
                  {check.spread.highest.name}, at {check.spread.highest.valueText}.
                  {#if check.note}{check.note}{/if}
                  {#if check.id === 'militarySpending' && implied !== undefined}
                    Governmint’s budget puts defence at {percent(government?.defenceShareOfBudget ?? 0)} of government spending, which comes to {percent(implied)} of GDP
                    here.
                  {/if}
                </p>
              </details>
            </li>
          {/each}
        </ul>
        <p class="eu-help">
          On each bar: the outlined band is where nine in ten comparable real countries sit, the track is the full spread, and the dot is your nation. Real-world
          numbers gathered {dateInWords(report.snapshotDate)}; the <a href="/data/">data page</a> has the sources.
        </p>
      </div>
    {/if}

    {#if report.pyramid}
      <div class="part">
        <h3>Estimated population pyramid</h3>
        <PyramidChart pyramid={report.pyramid} />
      </div>
    {/if}

    <div class="part take">
      <h3>Take it with you</h3>
      <ShareButtons
        url={link}
        title={`${title}: ${report.summary.toLowerCase()}`}
        text={`${shortDescription(nation, report)} Checked with ${siteName}.`}
        {forumBody}
        description={() => description}
        picture={() => svgToPicture(card(1200, 630), { width: 1200, height: 630 })}
        heading={nation.name ? `Share ${nation.name}` : 'Share your results'}
        said={{ link: 'Link copied: every number is in it.' }}
      />
      <div class="eu-row">
        <label class="eu-field pick">
          <span class="eu-label">Card size</span>
          <select class="eu-select" bind:value={size}>
            {#each PICTURE_SIZES as entry (entry.id)}
              <option value={entry.id}>{entry.name}, {entry.width} x {entry.height}</option>
            {/each}
          </select>
        </label>
        <label class="eu-field pick">
          <span class="eu-label">Format</span>
          <select class="eu-select" bind:value={format}>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
            <option value="svg">SVG</option>
          </select>
        </label>
      </div>
      <div class="eu-row">
        <button type="button" class="eu-btn" data-click="bounce" onclick={downloadCard}><Icon icon={faDownload} /> Results card</button>
        <button type="button" class="eu-btn" data-click="bounce" onclick={downloadCsv} disabled={report.checks.length === 0}>
          <Icon icon={faFileCsv} /> CSV of the checks
        </button>
        <ProfileButtons profile={saved} onload={loaded} onerror={(errors) => toast(errors[0]?.message ?? 'That file isn’t a nation profile. Pick one that ends in .eurth.json.')} />
      </div>
      <p class="eu-help">
        The link holds every number. The profile file carries your nation from one Eurth tool to the next; nothing is kept in this browser.
      </p>
    </div>
  </section>
</div>

<style>
  .checker {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
    gap: var(--space-6);
    align-items: start;
  }

  .controls {
    gap: var(--space-4);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4) var(--space-3);
    align-items: start;
  }

  .unit {
    color: var(--ink-muted);
    font: var(--type-note);
  }

  .results {
    gap: var(--space-5);
    min-width: 0;
  }

  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2) var(--space-4);
  }

  h2 {
    font: var(--type-headline-sm);
    overflow-wrap: anywhere;
  }

  h3 {
    font: var(--type-heading);
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    margin: 0;
  }

  .part {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }

  .verdict {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font: var(--type-label);
    white-space: nowrap;
  }

  .verdict.plausible {
    color: var(--success-text);
  }

  .verdict.stretch {
    color: var(--caution-text);
  }

  .verdict.unlikely {
    color: var(--danger-text);
  }

  .scale,
  .checks {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .scale li {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    padding: var(--space-2) 0;
    border-top: 1px solid var(--line);
    font: var(--type-body-sm);
  }

  .what {
    font: var(--type-label);
  }

  .what .eu-data {
    margin-left: var(--space-1);
  }

  .check {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
    gap: var(--space-1) var(--space-4);
    align-items: center;
    padding: var(--space-3) 0 0;
    border-top: 1px solid var(--line);
  }

  .words {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
    font: var(--type-body-sm);
  }

  .more {
    grid-column: 1 / -1;
    font: var(--type-body-sm);
  }

  .more summary {
    display: inline-flex;
    align-items: center;
    min-height: var(--size-target);
    color: var(--accent-text);
    font: var(--type-label);
    cursor: pointer;
  }

  .more p {
    max-width: var(--size-measure);
    margin: 0 0 var(--space-3);
    color: var(--ink-muted);
  }

  .pick {
    flex: 1 1 var(--space-16);
    min-width: 0;
  }

  @media (max-width: 900px) {
    .checker {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .check {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .words {
      grid-column: 1 / -1;
    }
  }
</style>
