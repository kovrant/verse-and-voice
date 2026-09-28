import { pdfjs } from "react-pdf"

// Must run in browser before any pdfjs.getDocument call.
if (typeof window !== "undefined" && pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
}

export { pdfjs }
