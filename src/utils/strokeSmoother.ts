import { Point } from '../types/board';

export type SmoothingLevel = 'light' | 'medium' | 'strong' | 'aggressive';

/**
 * Real-time moving average filter for live drawing
 * Removes tablet finger jitter instantly while drawing
 */
export function stabilizePoint(
  prev: Point | null,
  current: Point,
  weight = 0.55
): Point {
  if (!prev) return current;
  return {
    x: prev.x + (current.x - prev.x) * (1 - weight),
    y: prev.y + (current.y - prev.y) * (1 - weight),
    pressure: current.pressure ?? 0.5,
    timestamp: current.timestamp,
  };
}

/**
 * Removes touch-screen liftoff hook (common artifact when lifting a finger from glass)
 */
export function removeLiftoffHook(points: Point[]): Point[] {
  if (points.length < 5) return points;

  const n = points.length;
  const pLast = points[n - 1];
  const pPrev = points[n - 2];
  const pAnte = points[n - 3];

  const seg1 = { x: pPrev.x - pAnte.x, y: pPrev.y - pAnte.y };
  const seg2 = { x: pLast.x - pPrev.x, y: pLast.y - pPrev.y };

  const len1 = Math.hypot(seg1.x, seg1.y);
  const len2 = Math.hypot(seg2.x, seg2.y);

  if (len1 > 3 && len2 > 1 && len2 < 20) {
    const dot = seg1.x * seg2.x + seg1.y * seg2.y;
    const cosAngle = dot / (len1 * len2);
    // If the last point hooked backward (> 110 degrees turn) with a short flick
    if (cosAngle < -0.34) {
      return points.slice(0, n - 1);
    }
  }

  return points;
}

/**
 * Calculates perpendicular distance from point p to line segment (a, b)
 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Douglas-Peucker simplification
 */
export function simplifyPoints(points: Point[], tolerance = 2.0): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

/**
 * Chaikin's corner cutting algorithm for organic fluid curves
 */
export function chaikinSmooth(points: Point[], iterations = 2): Point[] {
  if (points.length < 3) return points;

  let current = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      // Q = 0.75 P0 + 0.25 P1
      const q: Point = {
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
        pressure: (p0.pressure ?? 0.5) * 0.75 + (p1.pressure ?? 0.5) * 0.25,
      };

      // R = 0.25 P0 + 0.75 P1
      const r: Point = {
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
        pressure: (p0.pressure ?? 0.5) * 0.25 + (p1.pressure ?? 0.5) * 0.75,
      };

      next.push(q, r);
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

/**
 * Detects sharp corner indices (angles < threshold)
 * Crucial so digits like '4', '7', 'Z', square roots, and '+' retain sharp corners
 */
export function findCornerIndices(points: Point[], angleThresholdDeg = 115): number[] {
  const corners: number[] = [0];
  const step = 2;

  for (let i = step; i < points.length - step; i++) {
    const pPrev = points[i - step];
    const pCurr = points[i];
    const pNext = points[i + step];

    const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    if (len1 > 3 && len2 > 3) {
      const dot = v1.x * v2.x + v1.y * v2.y;
      const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
      const angleDeg = (Math.acos(cosAngle) * 180) / Math.PI;

      if (angleDeg < angleThresholdDeg) {
        corners.push(i);
        i += step;
      }
    }
  }

  corners.push(points.length - 1);
  return corners;
}

/**
 * Snaps a line to exact horizontal (0 deg) or vertical (90 deg) if within angle tolerance
 */
export function snapOrthoLine(
  p1: Point,
  p2: Point,
  toleranceDeg = 14
): { p1: Point; p2: Point } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;

  // Near horizontal (e.g. minus '-', fraction bar, equals '=')
  if (angle <= toleranceDeg) {
    const midY = (p1.y + p2.y) / 2;
    return {
      p1: { ...p1, y: midY },
      p2: { ...p2, y: midY },
    };
  }

  // Near vertical (e.g. '1', vertical bar of '+')
  if (angle >= 90 - toleranceDeg) {
    const midX = (p1.x + p2.x) / 2;
    return {
      p1: { ...p1, x: midX },
      p2: { ...p2, x: midX },
    };
  }

  return { p1, p2 };
}

/**
 * Geometric shape snap detection (lines, circles, boxes)
 */
export function detectGeometricShape(
  points: Point[],
  isAggressive = false
): {
  type: 'line' | 'circle';
  points: Point[];
} | null {
  if (points.length < 6) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const totalLength = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    return acc + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
  }, 0);

  const chordDist = Math.hypot(last.x - first.x, last.y - first.y);

  // 1. Straight Line Check
  const lineThreshold = isAggressive ? 0.88 : 0.94;
  if (totalLength > 16 && chordDist / totalLength > lineThreshold) {
    let maxDev = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const dev = perpendicularDistance(points[i], first, last);
      if (dev > maxDev) maxDev = dev;
    }
    const maxDevAllowed = isAggressive ? totalLength * 0.14 : totalLength * 0.08;
    if (maxDev < maxDevAllowed) {
      const ortho = isAggressive ? snapOrthoLine(first, last, 14) : { p1: first, p2: last };
      return {
        type: 'line',
        points: [ortho.p1, ortho.p2],
      };
    }
  }

  // 2. Circle / Ellipse Check
  const isClosed = chordDist < Math.max(30, totalLength * 0.22);
  if (isClosed && totalLength > 40) {
    let cx = 0;
    let cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;

    const radii = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
    const avgR = radii.reduce((a, b) => a + b, 0) / radii.length;
    const variance =
      radii.reduce((acc, r) => acc + Math.pow(r - avgR, 2), 0) / radii.length;
    const stdDev = Math.sqrt(variance);

    const maxStdDevRatio = isAggressive ? 0.32 : 0.22;
    if (stdDev / avgR < maxStdDevRatio && avgR > 8) {
      const numPts = 36;
      const circlePts: Point[] = [];
      for (let i = 0; i <= numPts; i++) {
        const theta = (i / numPts) * 2 * Math.PI;
        circlePts.push({
          x: cx + avgR * Math.cos(theta),
          y: cy + avgR * Math.sin(theta),
          pressure: 0.5,
        });
      }
      return {
        type: 'circle',
        points: circlePts,
      };
    }
  }

  return null;
}

/**
 * Main beautifier: transforms messy raw handwriting into crisp, smooth curves
 * preserves sharp corners for letters/digits (4, 7, +, -, =, √) and rounds curves (0, 3, 8, S, 2)
 */
export function beautifyStrokePoints(
  rawPoints: Point[],
  options: {
    snapShapes?: boolean;
    smoothingLevel?: SmoothingLevel;
  } = {}
): Point[] {
  if (rawPoints.length < 3) return rawPoints;

  const { snapShapes = true, smoothingLevel = 'aggressive' } = options;
  const isAggressive = smoothingLevel === 'aggressive';

  // Step 1: Remove finger liftoff flick hook
  let points = removeLiftoffHook(rawPoints);
  if (points.length < 3) points = rawPoints;

  // Step 2: Check if entire stroke is a rough straight line or circle
  if (snapShapes) {
    const shape = detectGeometricShape(points, isAggressive);
    if (shape) {
      return shape.points;
    }
  }

  // Step 3: Find sharp corners (vertices) to preserve in digits / math
  const angleThreshold =
    smoothingLevel === 'aggressive'
      ? 95
      : smoothingLevel === 'strong'
      ? 105
      : smoothingLevel === 'medium'
      ? 118
      : 128;

  const cornerIndices = findCornerIndices(points, angleThreshold);
  const beautified: Point[] = [];

  for (let c = 0; c < cornerIndices.length - 1; c++) {
    const segStart = cornerIndices[c];
    const segEnd = cornerIndices[c + 1];
    let segment = points.slice(segStart, segEnd + 1);

    if (segment.length <= 2) {
      beautified.push(...segment.slice(0, c === cornerIndices.length - 2 ? undefined : -1));
      continue;
    }

    const pFirst = segment[0];
    const pLast = segment[segment.length - 1];
    const segLength = segment.reduce((acc, p, i) => {
      if (i === 0) return 0;
      return acc + Math.hypot(p.x - segment[i - 1].x, p.y - segment[i - 1].y);
    }, 0);
    const chord = Math.hypot(pLast.x - pFirst.x, pLast.y - pFirst.y);

    // If segment between corners is nearly straight (like one bar of a '4' or '7' or '+'):
    const straightnessThreshold = isAggressive ? 0.90 : 0.94;
    if (segLength > 12 && chord / segLength > straightnessThreshold) {
      // In aggressive mode, snap segment straight
      const ortho = isAggressive
        ? snapOrthoLine(pFirst, pLast, 12)
        : { p1: pFirst, p2: pLast };

      const straightPts = [ortho.p1, ortho.p2];
      if (beautified.length > 0) {
        beautified.push(...straightPts.slice(1));
      } else {
        beautified.push(...straightPts);
      }
      continue;
    }

    // Otherwise it's an organic curve (like loop of 3, 5, 8, 2, x)
    const tolerance =
      smoothingLevel === 'aggressive'
        ? 2.8
        : smoothingLevel === 'strong'
        ? 2.0
        : smoothingLevel === 'medium'
        ? 1.2
        : 0.7;

    const simplified = simplifyPoints(segment, tolerance);

    const iterations =
      smoothingLevel === 'aggressive'
        ? 3
        : smoothingLevel === 'strong'
        ? 3
        : smoothingLevel === 'medium'
        ? 2
        : 1;

    const smoothed = chaikinSmooth(simplified, iterations);

    if (beautified.length > 0) {
      beautified.push(...smoothed.slice(1));
    } else {
      beautified.push(...smoothed);
    }
  }

  // Smooth connection if closed loop (0, 8, 6)
  if (beautified.length > 8) {
    const bFirst = beautified[0];
    const bLast = beautified[beautified.length - 1];
    const loopGap = Math.hypot(bLast.x - bFirst.x, bLast.y - bFirst.y);
    if (loopGap < (isAggressive ? 22 : 12)) {
      beautified[beautified.length - 1] = { ...bFirst };
    }
  }

  return beautified.length > 0 ? beautified : points;
}
