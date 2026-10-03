import * as pdfjsLib from 'pdfjs-dist';
import { PageData } from '../types/board';
import { generateId } from './uuid';

// Configure pdfjs worker using unpkg CDN matching installed version, or inline fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('Failed to configure pdf.worker.min.mjs:', err);
  }
}

export interface PdfImportProgress {
  currentPage: number;
  totalPages: number;
}

/**
 * Converts a PDF file into an array of DOSKA PageData objects with rendered high-res slide images.
 */
export async function convertPdfToPages(
  file: File,
  onProgress?: (progress: PdfImportProgress) => void
): Promise<PageData[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  const pages: PageData[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({ currentPage: pageNum, totalPages });

    const page = await pdf.getPage(pageNum);
    // Scale for high crispness on high-res displays
    const unscaledViewport = page.getViewport({ scale: 1 });
    // Fit into 1920x1080 slide bounds
    const scale = Math.min(1920 / unscaledViewport.width, 1080 / unscaledViewport.height, 2.0);
    const viewport = page.getViewport({ scale: Math.max(scale, 1.25) });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');

    if (context) {
      // White background for slides
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise;

      const dataUrl = canvas.toDataURL('image/png', 0.92);

      pages.push({
        id: generateId(),
        title: `Слайд ${pageNum} (${file.name.replace(/\.[^/.]+$/, '').slice(0, 20)})`,
        strokes: [],
        mathElements: [],
        graphs: [],
        pan: { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540 },
        zoom: 1,
        background: 'clean',
        backgroundImage: dataUrl,
      });
    }
  }

  return pages;
}
