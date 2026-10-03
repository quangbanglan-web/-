import { Stroke, LaserPoint, ThemeType, GraphPlot, ToolType, BoardBackground } from '../types/board';

export interface Viewport {
  pan: { x: number; y: number };
  zoom: number;
  width: number;
  height: number;
}

const mapImageCache: Record<string, HTMLImageElement> = {};

export function getCachedMapImage(src: string): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;
  if (!mapImageCache[src]) {
    const img = new Image();
    img.src = src;
    mapImageCache[src] = img;
  }
  const img = mapImageCache[src];
  return img.complete && img.naturalWidth > 0 ? img : null;
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
    bg: '#0f172a', // slate/chalkboard
    gridPrimary: '#1e293b',
    gridSecondary: '#334155',
    marginLine: 'rgba(239, 68, 68, 0.35)',
    textColor: '#f8fafc',
    defaultPen: '#ffffff', // white/neon
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

  // 3. Margin vertical red line for school notebook:
  // Strictly 75px (~2cm / 4 cells) from left edge of notebook sheet (-960px in 1920x1080)
  if (config.marginLine) {
    const marginWorldX = -960 + 75; // -885px
    const screenMarginX = Math.round((marginWorldX + pan.x) * zoom);
    if (screenMarginX >= 0 && screenMarginX <= width) {
      ctx.strokeStyle = config.marginLine;
      ctx.lineWidth = Math.max(1.5, 2 * zoom);
      ctx.beginPath();
      ctx.moveTo(screenMarginX, 0);
      ctx.lineTo(screenMarginX, height);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawBoardBackground(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  background: BoardBackground,
  baseCellSize = 32,
  backgroundImage?: string
) {
  const { pan, zoom, width, height } = viewport;

  if (backgroundImage) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const screenX = (-960 + pan.x) * zoom;
    const screenY = (-540 + pan.y) * zoom;
    const screenW = 1920 * zoom;
    const screenH = 1080 * zoom;

    const img = getCachedMapImage(backgroundImage);
    if (img) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = Math.min(24, 16 * zoom);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.restore();

      ctx.drawImage(img, screenX, screenY, screenW, screenH);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, screenW, screenH);
    }
    return;
  }

  if (background === 'grid' || background === 'math_grid') {
    drawInfiniteGrid(ctx, viewport, 'notebook', baseCellSize);
    return;
  }
  if (background === 'clean') {
    drawInfiniteGrid(ctx, viewport, 'clean', baseCellSize);
    return;
  }
  if (background === 'chalkboard' || background === 'blueprint') {
    drawInfiniteGrid(ctx, viewport, background, baseCellSize);
    return;
  }

  ctx.save();

  if (background === 'ruled') {
    // Ruled lines (Линейка) locked to world coordinates
    ctx.fillStyle = '#fcfbf7';
    ctx.fillRect(0, 0, width, height);

    const startX = -pan.x;
    const startY = -pan.y;
    const endX = startX + width / zoom;
    const endY = startY + height / zoom;

    const rowHeight = baseCellSize * 1.25;
    const firstRowY = Math.floor(startY / rowHeight) * rowHeight;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#c8d6ed';
    ctx.beginPath();
    for (let y = firstRowY; y <= endY; y += rowHeight) {
      const screenY = Math.round((y + pan.y) * zoom);
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
    }
    ctx.stroke();

    // Red vertical margin line strictly 75px from left edge of notebook sheet (-960px)
    const marginWorldX = -960 + 75; // -885px
    const screenMarginX = Math.round((marginWorldX + pan.x) * zoom);
    if (screenMarginX >= 0 && screenMarginX <= width) {
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = Math.max(1.5, 2 * zoom);
      ctx.beginPath();
      ctx.moveTo(screenMarginX, 0);
      ctx.lineTo(screenMarginX, height);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (background === 'millimeter' || background === 'mm') {
    // Millimeter paper locked to world coordinates
    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(0, 0, width, height);

    const startX = -pan.x;
    const startY = -pan.y;
    const endX = startX + width / zoom;
    const endY = startY + height / zoom;

    const mmStep = baseCellSize / 4;
    const majorStep = baseCellSize;
    const bigStep = baseCellSize * 5;

    // 1. Fine grid (if zoom is sufficient)
    if (mmStep * zoom >= 4) {
      const firstFineX = Math.floor(startX / mmStep) * mmStep;
      const firstFineY = Math.floor(startY / mmStep) * mmStep;

      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      for (let x = firstFineX; x <= endX; x += mmStep) {
        const sx = Math.round((x + pan.x) * zoom);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let y = firstFineY; y <= endY; y += mmStep) {
        const sy = Math.round((y + pan.y) * zoom);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
    }

    // 2. 1cm major grid
    const firstMajorX = Math.floor(startX / majorStep) * majorStep;
    const firstMajorY = Math.floor(startY / majorStep) * majorStep;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.beginPath();
    for (let x = firstMajorX; x <= endX; x += majorStep) {
      const sx = Math.round((x + pan.x) * zoom);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    for (let y = firstMajorY; y <= endY; y += majorStep) {
      const sy = Math.round((y + pan.y) * zoom);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    // 3. 5cm accent grid
    const firstBigX = Math.floor(startX / bigStep) * bigStep;
    const firstBigY = Math.floor(startY / bigStep) * bigStep;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.7)';
    ctx.beginPath();
    for (let x = firstBigX; x <= endX; x += bigStep) {
      const sx = Math.round((x + pan.x) * zoom);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    for (let y = firstBigY; y <= endY; y += bigStep) {
      const sy = Math.round((y + pan.y) * zoom);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    ctx.restore();
    return;
  }

  // High-Resolution Subject Maps: world, russia, europe, history
  // Rendered in world coordinates centered at (-960, -540, 1920x1080)
  const isHistory = background.includes('history');
  ctx.fillStyle = isHistory ? '#fbf8f1' : '#f0f9ff';
  ctx.fillRect(0, 0, width, height);

  const mapOriginX = -960;
  const mapOriginY = -540;
  const mapW = 1920;
  const mapH = 1080;

  const screenMapX = (mapOriginX + pan.x) * zoom;
  const screenMapY = (mapOriginY + pan.y) * zoom;
  const screenMapW = mapW * zoom;
  const screenMapH = mapH * zoom;

  let mapSrc = '/maps/world.svg';
  let mapTitle = 'КАРТА МИРА';

  if (background.includes('russia')) {
    mapSrc = '/maps/russia.svg';
    mapTitle = 'КОНТУРНАЯ КАРТА РОССИИ';
  } else if (background.includes('europe')) {
    mapSrc = '/maps/europe.svg';
    mapTitle = 'КОНТУРНАЯ КАРТА ЕВРОПЫ';
  } else if (background.includes('history')) {
    mapSrc = '/maps/history.svg';
    mapTitle = 'ИСТОРИЧЕСКАЯ КАРТА';
  }

  // Draw background frame/ocean
  ctx.fillStyle = isHistory ? '#fdfaf2' : '#ffffff';
  ctx.fillRect(screenMapX, screenMapY, screenMapW, screenMapH);
  ctx.strokeStyle = isHistory ? '#b45309' : '#0284c7';
  ctx.lineWidth = Math.max(1.5, 2 * zoom);
  ctx.strokeRect(screenMapX, screenMapY, screenMapW, screenMapH);

  // Cached SVG image rendering
  const img = getCachedMapImage(mapSrc);
  if (img) {
    ctx.drawImage(img, screenMapX, screenMapY, screenMapW, screenMapH);
  } else {
    // Elegant fallback during initial load
    ctx.fillStyle = isHistory ? '#78350f' : '#0369a1';
    ctx.font = `600 ${Math.max(14, Math.round(18 * zoom))}px 'JetBrains Mono', sans-serif`;
    ctx.fillText(`${mapTitle} (Загрузка...)`, screenMapX + 30 * zoom, screenMapY + 50 * zoom);
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

  // 3b. Double Arrow (vectors, dimensions)
  if (stroke.tool === 'double-arrow') {
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

      // Head at p2
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

      // Head at p1
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(
        p1.x + headLen * Math.cos(angle - Math.PI / 6),
        p1.y + headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        p1.x + headLen * Math.cos(angle + Math.PI / 6),
        p1.y + headLen * Math.sin(angle + Math.PI / 6)
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

  // 4b. Square (1:1 aspect ratio)
  if (stroke.tool === 'square') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      const sx = p1.x + (dx >= 0 ? side : -side);
      const sy = p1.y + (dy >= 0 ? side : -side);

      ctx.lineWidth = stroke.width * zoom;
      ctx.strokeRect(
        Math.min(p1.x, sx),
        Math.min(p1.y, sy),
        side,
        side
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

  // 5b. Ellipse (arbitrary aspect ratio)
  if (stroke.tool === 'ellipse') {
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

  // 9. Trapezoid (isosceles)
  if (stroke.tool === 'trapezoid') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const lx = Math.min(p1.x, p2.x);
      const ty = Math.min(p1.y, p2.y);
      const by = ty + h;
      const inset = w * 0.2;
      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.moveTo(lx + inset, ty);
      ctx.lineTo(lx + w - inset, ty);
      ctx.lineTo(lx + w, by);
      ctx.lineTo(lx, by);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 10. Right Trapezoid
  if (stroke.tool === 'right-trapezoid') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const lx = Math.min(p1.x, p2.x);
      const ty = Math.min(p1.y, p2.y);
      const by = ty + h;
      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.moveTo(lx, ty);
      ctx.lineTo(lx + w * 0.6, ty);
      ctx.lineTo(lx + w, by);
      ctx.lineTo(lx, by);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 11. Parallelogram
  if (stroke.tool === 'parallelogram') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const lx = Math.min(p1.x, p2.x);
      const ty = Math.min(p1.y, p2.y);
      const by = ty + h;
      const shiftX = w * 0.25;
      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.moveTo(lx + shiftX, ty);
      ctx.lineTo(lx + w, ty);
      ctx.lineTo(lx + w - shiftX, by);
      ctx.lineTo(lx, by);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 12. Rhombus
  if (stroke.tool === 'rhombus') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const hw = Math.abs(p2.x - p1.x) / 2;
      const hh = Math.abs(p2.y - p1.y) / 2;
      ctx.lineWidth = stroke.width * zoom;
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 13. 3D Rectangular Box (wireframe with dashed hidden lines)
  if (stroke.tool === 'box3d') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const lx = Math.min(p1.x, p2.x);
      const ty = Math.min(p1.y, p2.y);
      const rx = lx + w;
      const by = ty + h;
      const depth = Math.min(w, h) * 0.35;
      const ox = depth * 0.7;
      const oy = -depth * 0.5;
      ctx.lineWidth = stroke.width * zoom;

      // Front face
      ctx.beginPath();
      ctx.rect(lx, ty, w, h);
      ctx.stroke();

      // Top face edges
      ctx.beginPath();
      ctx.moveTo(lx, ty);
      ctx.lineTo(lx + ox, ty + oy);
      ctx.lineTo(rx + ox, ty + oy);
      ctx.lineTo(rx, ty);
      ctx.stroke();

      // Right face edge
      ctx.beginPath();
      ctx.moveTo(rx, ty);
      ctx.lineTo(rx + ox, ty + oy);
      ctx.lineTo(rx + ox, by + oy);
      ctx.lineTo(rx, by);
      ctx.stroke();

      // Dashed hidden lines
      ctx.setLineDash([5 * zoom, 4 * zoom]);
      ctx.beginPath();
      ctx.moveTo(lx, by);
      ctx.lineTo(lx + ox, by + oy);
      ctx.lineTo(rx + ox, by + oy);
      ctx.moveTo(lx + ox, ty + oy);
      ctx.lineTo(lx + ox, by + oy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    return;
  }

  // 13b. 3D Cube (strict 1:1:1 proportions)
  if (stroke.tool === 'cube3d') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const s = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
      const lx = Math.min(p1.x, p2.x);
      const ty = Math.min(p1.y, p2.y);
      const rx = lx + s;
      const by = ty + s;
      const depth = s * 0.35;
      const ox = depth * 0.7;
      const oy = -depth * 0.5;
      ctx.lineWidth = stroke.width * zoom;

      // Front face
      ctx.beginPath();
      ctx.rect(lx, ty, s, s);
      ctx.stroke();

      // Top face
      ctx.beginPath();
      ctx.moveTo(lx, ty);
      ctx.lineTo(lx + ox, ty + oy);
      ctx.lineTo(rx + ox, ty + oy);
      ctx.lineTo(rx, ty);
      ctx.stroke();

      // Right face
      ctx.beginPath();
      ctx.moveTo(rx, ty);
      ctx.lineTo(rx + ox, ty + oy);
      ctx.lineTo(rx + ox, by + oy);
      ctx.lineTo(rx, by);
      ctx.stroke();

      // Dashed hidden lines
      ctx.setLineDash([5 * zoom, 4 * zoom]);
      ctx.beginPath();
      ctx.moveTo(lx, by);
      ctx.lineTo(lx + ox, by + oy);
      ctx.lineTo(rx + ox, by + oy);
      ctx.moveTo(lx + ox, ty + oy);
      ctx.lineTo(lx + ox, by + oy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    return;
  }

  // 14. 3D Cylinder
  if (stroke.tool === 'cylinder3d') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const lx = Math.min(p1.x, p2.x);
      const ty = Math.min(p1.y, p2.y);
      const cx = lx + w / 2;
      const rx = w / 2;
      const ry = Math.max(w * 0.15, 10 * zoom);
      ctx.lineWidth = stroke.width * zoom;

      // Top ellipse
      ctx.beginPath();
      ctx.ellipse(cx, ty + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Side lines
      ctx.beginPath();
      ctx.moveTo(lx, ty + ry);
      ctx.lineTo(lx, ty + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx + w, ty + ry);
      ctx.lineTo(lx + w, ty + h);
      ctx.stroke();

      // Bottom ellipse (solid)
      ctx.beginPath();
      ctx.ellipse(cx, ty + h, rx, ry, 0, 0, Math.PI);
      ctx.stroke();

      // Bottom dashed arc (hidden)
      ctx.setLineDash([5 * zoom, 4 * zoom]);
      ctx.beginPath();
      ctx.ellipse(cx, ty + h, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    return;
  }

  // 15. 3D Pyramid (square base)
  if (stroke.tool === 'pyramid3d') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const lx = Math.min(p1.x, p2.x);
      const ty = Math.min(p1.y, p2.y);
      const by = ty + h;
      const rx = lx + w;
      const apex = { x: lx + w / 2, y: ty };
      ctx.lineWidth = stroke.width * zoom;

      // Front edges (apex to base corners)
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(lx, by);
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(rx, by);
      ctx.stroke();

      // Base visible edges
      ctx.beginPath();
      ctx.moveTo(lx, by);
      ctx.lineTo(rx, by);
      ctx.stroke();

      // Hidden base edges (dashed)
      const depth = w * 0.3;
      const bx = lx + w / 4;
      const bbx = rx - w / 4;
      const bay = by - depth * 0.4;

      ctx.setLineDash([5 * zoom, 4 * zoom]);
      ctx.beginPath();
      ctx.moveTo(lx, by);
      ctx.lineTo(bx, bay);
      ctx.lineTo(bbx, bay);
      ctx.lineTo(rx, by);
      ctx.moveTo(bx, bay);
      ctx.lineTo(apex.x, apex.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    return;
  }

  // 15b. 3D Cone
  if (stroke.tool === 'cone3d') {
    if (pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const lx = Math.min(p1.x, p2.x);
      const ty = Math.min(p1.y, p2.y);
      const by = ty + h;
      const cx = lx + w / 2;
      const rx = w / 2;
      const ry = Math.max(w * 0.15, 8 * zoom);
      const apex = { x: cx, y: ty };
      ctx.lineWidth = stroke.width * zoom;

      // Slant sides
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(lx, by);
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(lx + w, by);
      ctx.stroke();

      // Base solid lower arc
      ctx.beginPath();
      ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI);
      ctx.stroke();

      // Base dashed upper arc (hidden)
      ctx.setLineDash([5 * zoom, 4 * zoom]);
      ctx.beginPath();
      ctx.ellipse(cx, by, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Dashed height line from apex to center of base
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(cx, by);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    return;
  }

  // 16. Freehand Pen / Highlighter with natural smooth bezier curves
  if (pts.length === 1) {
    const rawP = stroke.points[0]?.pressure ?? 0.5;
    const dotW = stroke.tool === 'pen' && stroke.points[0]?.pressure !== undefined
      ? stroke.width * (0.25 + 0.75 * rawP) * zoom
      : stroke.width * zoom;
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, dotW / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const hasPressurePoints = stroke.tool === 'pen' && stroke.points.some((p) => p.pressure !== undefined && Math.abs(p.pressure - 0.5) > 0.05);
  if (hasPressurePoints && pts.length > 2) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const pr = ((stroke.points[i]?.pressure ?? 0.5) + (stroke.points[i + 1]?.pressure ?? 0.5)) / 2;
      ctx.lineWidth = stroke.width * (0.25 + 0.75 * pr) * zoom;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
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
