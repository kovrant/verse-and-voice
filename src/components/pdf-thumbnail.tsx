"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/esm/Page/AnnotationLayer.css"
import "react-pdf/dist/esm/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PdfThumbnailProps {
  fileUrl: string
  width?: number
  fallback: ReactNode
}

export function PdfThumbnail({ fileUrl, width = 320, fallback }: PdfThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: "300px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[hsl(var(--background))]"
    >
      {(!visible || errored || !rendered) && (
        <div className="absolute inset-0">{fallback}</div>
      )}

      {visible && !errored && (
        <div className="absolute inset-0 flex items-start justify-center">
          <Document
            file={fileUrl}
            loading={null}
            error={null}
            onLoadError={() => setErrored(true)}
            className="w-full h-full flex items-start justify-center"
          >
            <Page
              pageNumber={1}
              width={width}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onRenderSuccess={() => setRendered(true)}
              onRenderError={() => setErrored(true)}
              loading={null}
              error={null}
              className="!bg-transparent [&>canvas]:!w-full [&>canvas]:!h-auto [&>canvas]:object-contain"
            />
          </Document>
        </div>
      )}
    </div>
  )
}
