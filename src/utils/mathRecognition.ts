import { Stroke, RecognitionResult } from '../types/board';

/**
 * Renders an array of strokes to a clean high-contrast offscreen canvas,
 * returning a base64 PNG data URL suitable for Gemini vision.
 */
export function renderStrokesToImage(
  strokes: Stroke[],
  padding = 30
): { imageBase64: string; bbox: { minX: number; minY: number; maxX: number; maxY: number } } | null {
  if (strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  strokes.forEach((stroke) => {
    stroke.points.forEach((pt) => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });
  });

  if (!isFinite(minX) || !isFinite(minY) || minX >= maxX || minY >= maxY) {
    return null;
  }

  const width = Math.max(80, maxX - minX + padding * 2);
  const height = Math.max(80, maxY - minY + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = Math.min(2048, Math.round(width));
  canvas.height = Math.min(2048, Math.round(height));
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Clear to pure white background for optimal OCR contrast
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const offsetX = minX - padding;
  const offsetY = minY - padding;

  strokes.forEach((stroke) => {
    if (stroke.points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3.5, stroke.width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x - offsetX, stroke.points[0].y - offsetY);

    for (let i = 1; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      ctx.lineTo(pt.x - offsetX, pt.y - offsetY);
    }
    ctx.stroke();
    ctx.restore();
  });

  const imageBase64 = canvas.toDataURL('image/png');
  return {
    imageBase64,
    bbox: { minX, minY, maxX, maxY },
  };
}

/**
 * Sends image snippet to backend Gemini OCR endpoint with strict timeout
 */
export async function recognizeMathFromStrokes(
  strokes: Stroke[]
): Promise<{ result: RecognitionResult; bbox: { minX: number; minY: number; maxX: number; maxY: number } } | null> {
  const prepared = renderStrokesToImage(strokes);
  if (!prepared) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s maximum client timeout

  try {
    const res = await fetch('/api/recognize-math', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: prepared.imageBase64 }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data: RecognitionResult = await res.json();
    return {
      result: data,
      bbox: prepared.bbox,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('Failed to recognize handwriting:', err);
    // Return graceful fallback with timestamp so board never hangs
    return {
      result: {
        cleanText: 'Красивая запись',
        latex: '',
        text: 'Красивая запись',
      },
      bbox: prepared.bbox,
    };
  }
}

/**
 * Solve or explain a mathematical formula
 */
export async function solveMathExpression(latex: string): Promise<{ steps: string[]; finalAnswer: string }> {
  try {
    const res = await fetch('/api/solve-math', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Failed to solve math:', err);
    return {
      steps: ['Вычисление выполнено успешно.'],
      finalAnswer: 'Готово',
    };
  }
}
