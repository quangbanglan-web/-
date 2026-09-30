import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crc = zlib.crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbaBuffer) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // Filter 0 (None)
    rgbaBuffer.copy(rawData, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 }));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 2D Signed Distance Functions for clean anti-aliasing
function sdRoundBox(x, y, cx, cy, w, h, r) {
  const dx = Math.abs(x - cx) - (w / 2 - r);
  const dy = Math.abs(y - cy) - (h / 2 - r);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  const outDist = Math.hypot(ox, oy);
  const inDist = Math.min(Math.max(dx, dy), 0);
  return outDist + inDist - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.hypot(dx, dy);
}

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

function blendPixel(rgba, idx, r, g, b, a) {
  if (a <= 0) return;
  const prevA = rgba[idx + 3] / 255;
  const outA = a + prevA * (1 - a);
  if (outA <= 0) return;

  const prevR = rgba[idx];
  const prevG = rgba[idx + 1];
  const prevB = rgba[idx + 2];

  rgba[idx] = Math.round((r * a + prevR * prevA * (1 - a)) / outA);
  rgba[idx + 1] = Math.round((g * a + prevG * prevA * (1 - a)) / outA);
  rgba[idx + 2] = Math.round((b * a + prevB * prevA * (1 - a)) / outA);
  rgba[idx + 3] = Math.round(outA * 255);
}

function renderChalkboardIcon(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;

  // Board dimensions
  const woodSize = size * 0.88;
  const woodRadius = size * 0.14;
  const slateSize = size * 0.80;
  const slateRadius = size * 0.10;

  // Geometry triangle coordinates
  const tA = [size * 0.24, size * 0.73];
  const tB = [size * 0.24, size * 0.31];
  const tC = [size * 0.66, size * 0.73];

  const tInnerA = [size * 0.32, size * 0.66];
  const tInnerB = [size * 0.32, size * 0.47];
  const tInnerC = [size * 0.51, size * 0.66];

  const strokeWidth = Math.max(2, size * 0.026);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // 1. Wood Frame
      const dWood = sdRoundBox(x, y, cx, cy, woodSize, woodSize, woodRadius);
      if (dWood <= 1.0) {
        const woodAlpha = Math.max(0, Math.min(1, 0.5 - dWood));
        // Vertical gradient from #b45309 to #78350f
        const tGrad = y / size;
        const woodR = Math.round(180 * (1 - tGrad) + 120 * tGrad);
        const woodG = Math.round(83 * (1 - tGrad) + 53 * tGrad);
        const woodB = Math.round(9 * (1 - tGrad) + 15 * tGrad);
        blendPixel(buffer, idx, woodR, woodG, woodB, woodAlpha);
      }

      // 2. Slate chalkboard
      const dSlate = sdRoundBox(x, y, cx, cy, slateSize, slateSize, slateRadius);
      if (dSlate <= 1.0) {
        const slateAlpha = Math.max(0, Math.min(1, 0.5 - dSlate));
        // Dark forest green gradient #0f4c3a to #06382a
        const tGrad = (x + y) / (size * 2);
        const slateR = Math.round(15 * (1 - tGrad) + 6 * tGrad);
        const slateG = Math.round(76 * (1 - tGrad) + 56 * tGrad);
        const slateB = Math.round(58 * (1 - tGrad) + 42 * tGrad);
        blendPixel(buffer, idx, slateR, slateG, slateB, slateAlpha);

        // 3. Grid lines (subtle white dash/dots)
        const gridSpacing = size * 0.20;
        const onGridX = Math.abs((x - cx) % gridSpacing) < 1.0;
        const onGridY = Math.abs((y - cy) % gridSpacing) < 1.0;
        if ((onGridX || onGridY) && dSlate < -3) {
          blendPixel(buffer, idx, 255, 255, 255, 0.08);
        }

        // 4. Geometry triangle: fill & outline
        const inOuterTri = pointInTriangle(x, y, tA[0], tA[1], tB[0], tB[1], tC[0], tC[1]);
        const inInnerTri = pointInTriangle(x, y, tInnerA[0], tInnerA[1], tInnerB[0], tInnerB[1], tInnerC[0], tInnerC[1]);

        if (inOuterTri && !inInnerTri) {
          blendPixel(buffer, idx, 255, 255, 255, 0.15);
        }

        // Triangle strokes
        const dEdge1 = sdSegment(x, y, tA[0], tA[1], tB[0], tB[1]) - strokeWidth / 2;
        const dEdge2 = sdSegment(x, y, tB[0], tB[1], tC[0], tC[1]) - strokeWidth / 2;
        const dEdge3 = sdSegment(x, y, tC[0], tC[1], tA[0], tA[1]) - strokeWidth / 2;
        const minDEdge = Math.min(dEdge1, dEdge2, dEdge3);

        if (minDEdge <= 1.0) {
          const edgeAlpha = Math.max(0, Math.min(1, 0.5 - minDEdge));
          blendPixel(buffer, idx, 255, 255, 255, edgeAlpha * 0.95);
        }

        // Inner cutout stroke
        const dIn1 = sdSegment(x, y, tInnerA[0], tInnerA[1], tInnerB[0], tInnerB[1]) - strokeWidth * 0.35;
        const dIn2 = sdSegment(x, y, tInnerB[0], tInnerB[1], tInnerC[0], tInnerC[1]) - strokeWidth * 0.35;
        const dIn3 = sdSegment(x, y, tInnerC[0], tInnerC[1], tInnerA[0], tInnerA[1]) - strokeWidth * 0.35;
        const minDIn = Math.min(dIn1, dIn2, dIn3);
        if (minDIn <= 1.0) {
          const inAlpha = Math.max(0, Math.min(1, 0.5 - minDIn));
          blendPixel(buffer, idx, 255, 255, 255, inAlpha * 0.8);
        }

        // 5. Compass arc (gold)
        const dArcCenter = Math.hypot(x - tA[0], y - tA[1]);
        const arcRadius = size * 0.18;
        const dArc = Math.abs(dArcCenter - arcRadius) - strokeWidth * 0.45;
        const angle = Math.atan2(y - tA[1], x - tA[0]);
        // Angle from -PI/2 (up) to 0 (right)
        if (angle >= -Math.PI / 2 - 0.05 && angle <= 0.05 && dArc <= 1.0) {
          const arcAlpha = Math.max(0, Math.min(1, 0.5 - dArc));
          blendPixel(buffer, idx, 251, 191, 36, arcAlpha); // #fbbf24
        }

        // Angle origin dot
        const dDot = Math.hypot(x - tA[0], y - tA[1]) - strokeWidth * 0.6;
        if (dDot <= 1.0) {
          const dotAlpha = Math.max(0, Math.min(1, 0.5 - dDot));
          blendPixel(buffer, idx, 251, 191, 36, dotAlpha);
        }

        // 6. Chalk stick on top right
        // Chalk at angle: from (size*0.56, size*0.48) to (size*0.78, size*0.35)
        const chalkP1 = [size * 0.56, size * 0.49];
        const chalkP2 = [size * 0.77, size * 0.35];
        const dChalk = sdSegment(x, y, chalkP1[0], chalkP1[1], chalkP2[0], chalkP2[1]) - size * 0.035;
        if (dChalk <= 1.0) {
          const chalkAlpha = Math.max(0, Math.min(1, 0.5 - dChalk));
          blendPixel(buffer, idx, 255, 255, 255, chalkAlpha * 0.95);
        }
      }

      // 7. Chalk tray at the bottom
      const trayWidth = size * 0.45;
      const trayHeight = size * 0.025;
      const dTray = sdRoundBox(x, y, cx, size * 0.835, trayWidth, trayHeight, trayHeight / 2);
      if (dTray <= 1.0) {
        const trayAlpha = Math.max(0, Math.min(1, 0.5 - dTray));
        blendPixel(buffer, idx, 217, 119, 6, trayAlpha);
      }

      // Small chalk piece on tray
      const chalkPieceW = size * 0.10;
      const chalkPieceH = size * 0.018;
      const dPiece = sdRoundBox(x, y, cx + size * 0.06, size * 0.825, chalkPieceW, chalkPieceH, chalkPieceH / 2);
      if (dPiece <= 1.0) {
        const pieceAlpha = Math.max(0, Math.min(1, 0.5 - dPiece));
        blendPixel(buffer, idx, 255, 255, 255, pieceAlpha * 0.95);
      }
    }
  }

  return buffer;
}

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');

console.log('Generating PWA icons...');

for (const size of [192, 512]) {
  console.log(`Rendering ${size}x${size}...`);
  const rgba = renderChalkboardIcon(size);
  const png = encodePng(size, size, rgba);
  const dest = path.join(publicDir, `icon-${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`Saved ${dest} (${png.length} bytes)`);
}

console.log('PWA icons successfully generated!');
