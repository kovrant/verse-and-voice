// Pure helpers for syncing in-page scroll position across clients.
//
// We sync a *ratio* (0..1) rather than raw pixels because teacher and student
// have independent zoom levels, so their scroll heights differ. The ratio maps
// consistently to "how far down the page" regardless of zoom.

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Ignore sub-pixel ratio noise that causes scroll ping-pong between clients. */
export const SCROLL_SYNC_EPS = 0.012

export function scrollRatioNear(a: number, b: number, eps = SCROLL_SYNC_EPS): boolean {
  return Math.abs(a - b) < eps
}

/** How far down the scroll container we are, as a 0..1 ratio. */
export function ratioFromScrollTop(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const max = Math.max(0, scrollHeight - clientHeight)
  return max > 0 ? clamp01(scrollTop / max) : 0
}

/** The scrollTop (px) that reproduces a given 0..1 ratio in this container. */
export function scrollTopFromRatio(
  ratio: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const max = Math.max(0, scrollHeight - clientHeight)
  return clamp01(ratio) * max
}
