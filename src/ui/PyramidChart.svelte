<script lang="ts">
  /*
   * The estimated population pyramid: men on the left, women on the right, oldest at the top.
   * The sides are told apart by where they are and by their headings, not by colour alone, and
   * the whole thing is described in a sentence for screen readers.
   */
  import { describePyramid } from '../stats/describe';
  import { percent } from '../stats/format';
  import type { Pyramid } from '../stats/pyramid';

  let { pyramid }: { pyramid: Pyramid } = $props();

  const rows = $derived([...pyramid.bands].reverse());
  const width = (share: number): string => `${((share / pyramid.widest) * 100).toFixed(1)}%`;
  const description = $derived(describePyramid(pyramid));
</script>

<figure class="pyramid">
  <div class="chart" role="img" aria-label={description}>
    <div class="row head" aria-hidden="true">
      <span class="side men">Men</span>
      <span class="age">Age</span>
      <span class="side">Women</span>
    </div>
    {#each rows as band (band.label)}
      <div class="row" aria-hidden="true">
        <span class="side men"><span class="bar men" style:width={width(band.male)}></span></span>
        <span class="age eu-data">{band.label}</span>
        <span class="side"><span class="bar women" style:width={width(band.female)}></span></span>
      </div>
    {/each}
  </div>
  <figcaption class="eu-muted">
    {description} Half the people are younger than {Math.round(pyramid.medianAge)}; for every 100 of working age there are
    {Math.round(pyramid.dependencyRatio)} children and elders ({percent(pyramid.under15)} and {percent(pyramid.over64)} of everyone). An estimate from the
    fertility rate and life expectancy alone: it knows nothing of wars, baby booms or migration.
  </figcaption>
</figure>

<style>
  .pyramid {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
    min-width: 0;
  }

  .chart {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--space-16) minmax(0, 1fr);
    align-items: center;
    gap: var(--space-2);
  }

  .head {
    color: var(--ink-muted);
    font: var(--type-note);
  }

  .side {
    display: flex;
    min-width: 0;
  }

  .side.men {
    justify-content: flex-end;
  }

  .age {
    text-align: center;
    color: var(--ink-muted);
  }

  .bar {
    display: block;
    height: var(--space-3);
    border-radius: var(--radius-sm);
    transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  /* Two fills that differ in lightness, with an edge on the lighter one so it shows on any ground. */
  .bar.men {
    background: var(--selected);
  }

  .bar.women {
    border: var(--size-ring) solid var(--selected);
    background: var(--surface);
  }

  figcaption {
    font: var(--type-body-sm);
  }
</style>
