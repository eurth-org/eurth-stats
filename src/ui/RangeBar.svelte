<script lang="ts">
  /*
   * One range bar: the full spread of real countries, the typical band inside it, and the
   * nation's marker. The marker slides into place (the tool's signature touch): from the middle
   * of the band when the bar first appears, and from where it was when a number changes. The
   * stylesheet stills it for reduced motion.
   *
   * The verdict is never the marker's colour alone: its word and icon sit beside the bar.
   */
  import { onMount } from 'svelte';
  import type { Check } from '../stats/check';

  let { check }: { check: Check } = $props();

  let placed = $state(false);
  onMount(() => {
    const frame = requestAnimationFrame(() => (placed = true));
    return () => cancelAnimationFrame(frame);
  });

  const percent = (position: number): string => `${(position * 100).toFixed(2)}%`;
  const marker = $derived(placed ? check.bar.marker : (check.bar.bandStart + check.bar.bandEnd) / 2);
  const label = $derived(
    `${check.label}: ${check.valueText}. Typical for ${check.groupLabel}: ${check.typical.text}. Lowest: ${check.spread.lowest.name}, ${check.spread.lowest.valueText}. Highest: ${check.spread.highest.name}, ${check.spread.highest.valueText}.`,
  );
</script>

<div class="bar" role="img" aria-label={label}>
  <div class="spread" style:left={percent(check.bar.spreadStart)} style:width={percent(check.bar.spreadEnd - check.bar.spreadStart)}></div>
  <div class="band" style:left={percent(check.bar.bandStart)} style:width={percent(check.bar.bandEnd - check.bar.bandStart)}></div>
  <div class="marker {check.verdict}" class:beyond={check.bar.beyond !== null} style:left={percent(marker)}></div>
</div>

<style>
  .bar {
    position: relative;
    height: var(--space-6);
    min-width: 0;
  }

  .spread,
  .band {
    position: absolute;
    top: 50%;
    height: var(--space-2);
    min-width: var(--space-2);
    border-radius: var(--radius-md);
    transform: translateY(-50%);
  }

  /* The full spread: a quiet track. The typical band: the same track with an edge that can be seen. */
  .spread {
    background: var(--line);
  }

  .band {
    height: var(--space-3);
    border: var(--size-ring) solid var(--line-strong);
    background: var(--surface);
  }

  .marker {
    position: absolute;
    top: 50%;
    width: var(--space-4);
    height: var(--space-4);
    border: var(--size-ring) solid var(--surface-raised);
    border-radius: var(--radius-md);
    background: var(--ink);
    transform: translate(-50%, -50%);
    transition: left 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .marker.plausible {
    background: var(--success-text);
  }

  .marker.stretch {
    background: var(--caution-text);
  }

  .marker.unlikely {
    background: var(--danger-text);
  }

  /* Off the end of the real spread: a square marker, so it reads differently without colour. */
  .marker.beyond {
    border-radius: var(--radius-sm);
  }
</style>
