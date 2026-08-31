import "./pdfjs-setup"

const cache = new Map<string, Promise<ArrayBuffer>>()

function startFetch(url: string): Promise<ArrayBuffer> {
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`PDF fetch failed: ${r.status}`)
      return r.arrayBuffer()
    })
    .catch((err) => {
      cache.delete(url)
      throw err
    })
  cache.set(url, p)
  return p
}

/** Start downloading a PDF so a later open is instant. Safe to call repeatedly. */
export function prefetchPdf(url: string | null | undefined): void {
  if (!url || cache.has(url)) return
  void startFetch(url)
}

/** Load PDF bytes, reusing an in-flight or completed download for this URL. */
export function loadPdfBytes(url: string): Promise<ArrayBuffer> {
  if (!cache.has(url)) startFetch(url)
  // pdf.js transfers the buffer to its worker and detaches it — always hand out a copy.
  return cache.get(url)!.then((buf) => buf.slice(0))
}

/** Warm the cache for paras near the current one (live class para switches). */
export function prefetchParaUrls(urlByPara: Record<number, string>, center: number, radius = 2) {
  for (let n = center - radius; n <= center + radius; n++) {
    prefetchPdf(urlByPara[n])
  }
}
