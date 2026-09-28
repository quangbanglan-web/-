import { Stroke, LaserPoint, ThemeType, GraphPlot, ToolType } from '../types/board';

export interface Viewport {
  pan: { x: number; y: number };
  zoom: number;
  width: number;
  height: number;
}

export const THEME_CONFIGS: Record<
  ThemeType,
  {
    bg: string;
    gridPrimary: string;
    gridSecondary: string;
    marginLine?: string;
    textColor: string;
    defaultPen: string;
  }
> = {
  notebook: {
    bg: '#fcfbf7',
    gridPrimary: '#c8d6ed',
    gridSecondary: '#b0c4e4',
    marginLine: '#f87171',
    textColor: '#1e293b',
    defaultPen: '#1e3a8a', // classic blue pen ink
  },
  chalkboard: {
    bg: '#25443a', // soft, pleasant school chalkboard green (not pitch dark)
    gridPrimary: 'rgba(255, 255, 255, 0.09)',
    gridSecondary: 'rgba(255, 255, 255, 0.16)',
    marginLine: 'rgba(248, 113, 113, 0.35)',
    textColor: '#f8fafc',
    defaultPen: '#ffffff', // white chalk
  },
  blueprint: {
    bg: '#0f172a',
    gridPrimary: 'rgba(56, 189, 248, 0.15)',
    gridSecondary: 'rgba(56, 189, 248, 0.3)',
    marginLine: 'rgba(244, 63, 94, 0.4)',
    textColor: '#f1f5f9',
    defaultPen: '#38bdf8',
  },
  clean: {
    bg: '#ffffff', // 100% pure blank white
    gridPrimary: 'transparent', // no grid at all!
    gridSecondary: 'transparent',
    textColor: '#0f172a',
    defaultPen: '#0f172a',
  },
};

/**
 * Draws the infinite squared grid or plain background
 */
export function drawInfiniteGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  theme: ThemeType,
  baseCellSize = 32
) {
  const { pan, zoom, width, height } = viewport;
  const config = THEME_CONFIGS[theme];

  // Fill background
  ctx.fillStyle = config.bg;
  ctx.fillRect(0, 0, width, height);

  // If clean white theme, NO grid lines are drawn at all
  if (theme === 'clean') {
    return;
  }

  const effectiveCellSize = baseCellSize * zoom;
  if (effectiveCellSize < 8) return;

  const startX = -pan.x;
  const startY = -pan.y;
  const endX = startX + width / zoom;
  const endY = startY + height / zoom;

  const firstGridX = Math.floor(startX / baseCellSize) * baseCellSize;
  const firstGridY = Math.floor(startY / baseCellSize) * baseCellSize;

  ctx.save();
  ctx.lineWidth = 1;

  // 1. Draw standard grid cells
  ctx.strokeStyle = config.gridPrimary;
  ctx.beginPath();

  for (let x = firstGridX; x <= endX; x += baseCellSize) {
    const screenX = Math.round((x + pan.x) * zoom);
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, height);
  }

  for (let y = firstGridY; y <= endY; y += baseCellSize) {
    const screenY = Math.round((y + pan.y) * zoom);
    ctx.moveTo(0, screenY);
    ctx.lineTo(width, screenY);
  }
  ctx.stroke();

  // 2. Draw 5-cell major lines (accent lines every 5 cells)
  const majorCellSize = baseCellSize * 5;
  const firstMajorX = Math.floor(startX / majorCellSize) * majorCellSize;
  const firstMajorY = Math.floor(startY / majorCellSize) * majorCellSize;

  ctx.strokeStyle = config.gridSecondary;
  ctx.lineWidth = 1.25;
  ctx.beginPath();

  for (let x = firstMajorX; x <= endX; x += majorCellSize) {
    const screenX = Math.round((x + pan.x) * zoom);
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, height);
  }

  for (let y = firstMajorY; y <= endY; y += majorCellSize) {
    const screenY = Math.round((y + pan.y) * zoom);
    ctx.moveTo(0, screenY);
    ctx.lineTo(width, screenY);
  }
  ctx.stroke();

  // 3. Margin vertical red line for school notebook
  if (config.marginLine) {
    const marginWorldX = 0;
    const screenMarginX = Math.round((marginWorldX + pan.x) * zoom);
    if (screenMarginX >= 0 && screenMarginX <= width) {
      ctx.strokeStyle = config.marginLine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenMarginX, 0);
      ctx.lineTo(screenMarginX, height);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws a single geometric stroke or freehand path
 */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  viewport: Viewport
) {
  if (stroke.points.length === 0) return;
  const { pan, zoom } = viewport;

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pts = stroke.points.map((p) => ({
    x: (p.x + pan.x) * zoom,
    y: (p.y + pan.y) * zoom,
  }));

  // 1. Straight Line
  if (stroke.tool === 'line') {
    if (pts.length >= 2) {
      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 2. Dashed Line (for geometry heights, hidden edges)
  if (stroke.tool === 'dashed-line') {
    if (pts.length >= 2) {
      ctx.lineWidth = stroke.width * zoom;
      ctx.setLineDash([8 * zoom, 6 * zoom]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 3. Arrow / Vector
  if (stroke.tool === 'arrow') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headLen = Math.max(12, stroke.width * 3.5) * zoom;
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x - headLen * Math.cos(angle - Math.PI / 6),
        p2.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        p2.x - headLen * Math.cos(angle + Math.PI / 6),
        p2.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 4. Rectangle
  if (stroke.tool === 'rect') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      ctx.lineWidth = stroke.width * zoom;
      ctx.strokeRect(
        Math.min(p1.x, p2.x),
        Math.min(p1.y, p2.y),
        Math.abs(p2.x - p1.x),
        Math.abs(p2.y - p1.y)
      );
    }
    ctx.restore();
    return;
  }

  // 5. Circle with Center Dot
  if (stroke.tool === 'circle') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const rx = Math.abs(p2.x - p1.x) / 2;
      const ry = Math.abs(p2.y - p1.y) / 2;
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, 2.5 * zoom), 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 6. Arbitrary / Isosceles Triangle
  if (stroke.tool === 'triangle') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const topX = (p1.x + p2.x) / 2;
      const topY = Math.min(p1.y, p2.y);
      const botY = Math.max(p1.y, p2.y);
      const leftX = Math.min(p1.x, p2.x);
      const rightX = Math.max(p1.x, p2.x);

      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(rightX, botY);
      ctx.lineTo(leftX, botY);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 7. Right-angled Triangle with right-angle corner marker
  if (stroke.tool === 'right-triangle') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const leftX = Math.min(p1.x, p2.x);
      const rightX = Math.max(p1.x, p2.x);
      const topY = Math.min(p1.y, p2.y);
      const botY = Math.max(p1.y, p2.y);

      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.moveTo(leftX, topY);
      ctx.lineTo(leftX, botY);
      ctx.lineTo(rightX, botY);
      ctx.closePath();
      ctx.stroke();

      // Square right-angle marker
      const sq = 12 * zoom;
      ctx.lineWidth = Math.max(1, (stroke.width * zoom) / 1.5);
      ctx.beginPath();
      ctx.moveTo(leftX, botY - sq);
      ctx.lineTo(leftX + sq, botY - sq);
      ctx.lineTo(leftX + sq, botY);
      ctx.stroke();

      // Small center dot in right angle
      ctx.beginPath();
      ctx.arc(leftX + sq / 2, botY - sq / 2, 1.5 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 8. Coordinate Axes
  if (stroke.tool === 'axes') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const cx = p1.x;
      const cy = p1.y;
      const r = Math.max(80 * zoom, Math.hypot(p2.x - p1.x, p2.y - p1.y));
      ctx.lineWidth = stroke.width * zoom;

      // X-Axis
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.stroke();

      // Y-Axis
      ctx.beginPath();
      ctx.moveTo(cx, cy + r);
      ctx.lineTo(cx, cy - r);
      ctx.stroke();

      // X Arrowhead
      const head = 10 * zoom;
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.lineTo(cx + r - head, cy - head / 2);
      ctx.lineTo(cx + r - head, cy + head / 2);
      ctx.closePath();
      ctx.fill();

      // Y Arrowhead
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx - head / 2, cy - r + head);
      ctx.lineTo(cx + head / 2, cy - r + head);
      ctx.closePath();
      ctx.fill();

      // Tick marks along axes
      const step = 32 * zoom;
      const tick = 4 * zoom;
      ctx.beginPath();
      for (let x = cx + step; x < cx + r - head; x += step) {
        ctx.moveTo(x, cy - tick);
        ctx.lineTo(x, cy + tick);
      }
      for (let x = cx - step; x > cx - r; x -= step) {
        ctx.moveTo(x, cy - tick);
        ctx.lineTo(x, cy + tick);
      }
      for (let y = cy + step; y < cy + r; y += step) {
        ctx.moveTo(cx - tick, y);
        ctx.lineTo(cx + tick, y);
      }
      for (let y = cy - step; y > cy - r + head; y -= step) {
        ctx.moveTo(cx - tick, y);
        ctx.lineTo(cx + tick, y);
      }
      ctx.stroke();

      // Labels
      ctx.font = `600 ${Math.round(14 * zoom)}px 'JetBrains Mono', sans-serif`;
      ctx.fillText('x', cx + r - 8 * zoom, cy + 18 * zoom);
      ctx.fillText('y', cx - 18 * zoom, cy - r + 14 * zoom);
      ctx.fillText('0', cx - 14 * zoom, cy + 16 * zoom);
    }
    ctx.restore();
    return;
  }

  // 9. Freehand Pen / Highlighter with natural smooth bezier curves
  if (pts.length === 1) {
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, (stroke.width * zoom) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.lineWidth = stroke.width * zoom;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Laser pointer trail drawing with neon glow
 */
export function drawLaserTrail(
  ctx: CanvasRenderingContext2D,
  points: LaserPoint[],
  viewport: Viewport
) {
  if (points.length < 2) return;
  const { pan, zoom } = viewport;
  const now = Date.now();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    const age = now - p2.time;
    if (age > 1200) continue;

    const alpha = Math.max(0, 1 - age / 1200);
    const x1 = (p1.x + pan.x) * zoom;
    const y1 = (p1.y + pan.y) * zoom;
    const x2 = (p2.x + pan.x) * zoom;
    const y2 = (p2.y + pan.y) * zoom;

    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
    ctx.lineWidth = 5 * zoom;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Glowing laser dot at cursor tip
  const lastPt = points[points.length - 1];
  const lastX = (lastPt.x + pan.x) * zoom;
  const lastY = (lastPt.y + pan.y) * zoom;

  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#f87171';
  ctx.shadowBlur = 12 * zoom;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 6 * zoom, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws mathematical function plot: y = f(x)
 */
export function drawGraphPlot(
  ctx: CanvasRenderingContext2D,
  graph: GraphPlot,
  viewport: Viewport
) {
  const { pan, zoom } = viewport;
  const cellSize = graph.cellSize * zoom;
  const originX = (graph.x + pan.x) * zoom;
  const originY = (graph.y + pan.y) * zoom;

  ctx.save();

  // 1. Draw mini coordinate axes
  const axisLength = 6 * cellSize;
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(originX - axisLength, originY);
  ctx.lineTo(originX + axisLength, originY);
  ctx.moveTo(originX, originY - axisLength);
  ctx.lineTo(originX, originY + axisLength);
  ctx.stroke();

  // 2. Evaluate and plot curve
  try {
    const fn = compileMathFormula(graph.formula);
    const [minX, maxX] = graph.rangeX;
    const step = 0.05;

    ctx.strokeStyle = graph.color;
    ctx.lineWidth = 2.5 * zoom;
    ctx.beginPath();

    let isFirst = true;

    for (let x = minX; x <= maxX; x += step) {
      const y = fn(x);
      if (isNaN(y) || !isFinite(y)) {
        isFirst = true;
        continue;
      }

      const screenX = originX + x * cellSize;
      const screenY = originY - y * cellSize;

      if (isFirst) {
        ctx.moveTo(screenX, screenY);
        isFirst = false;
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }
    ctx.stroke();

    // 3. Formula text label
    ctx.font = `600 ${Math.round(12 * zoom)}px 'JetBrains Mono', sans-serif`;
    ctx.fillStyle = graph.color;
    ctx.fillText(`y = ${graph.formula}`, originX + 10 * zoom, originY - axisLength + 16 * zoom);
  } catch (err) {
    console.warn('Failed to render graph:', err);
  }

  ctx.restore();
}

/**
 * Compiles mathematical string formula into a function
 */
function compileMathFormula(formula: string): (x: number) => number {
  let cleaned = formula
    .replace(/\^/g, '**')
    .replace(/sin/g, 'Math.sin')
    .replace(/cos/g, 'Math.cos')
    .replace(/tan/g, 'Math.tan')
    .replace(/sqrt/g, 'Math.sqrt')
    .replace(/abs/g, 'Math.abs')
    .replace(/pi/gi, 'Math.PI')
    .replace(/e/g, 'Math.E')
    .replace(/log/g, 'Math.log');

  cleaned = cleaned.replace(/(\d+)([a-zA-Z])/g, '$1 * $2');

  return new Function('x', `return ${cleaned};`) as (x: number) => number;
}
