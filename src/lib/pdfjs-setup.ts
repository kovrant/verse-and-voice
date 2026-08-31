import { pdfjs } from "react-pdf"

// Must run before any pdfjs.getDocument / prefetch — live class prefetches before the viewer chunk loads.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

export { pdfjs }
