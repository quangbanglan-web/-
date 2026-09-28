import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ToolType,
  Stroke,
  LaserPoint,
  MathElement,
  GraphPlot,
  ThemeType,
  PageData,
  Point,
  SubjectMode,
  ToolbarCustomization,
} from './types/board';
import {
  drawInfiniteGrid,
  drawStroke,
  drawLaserTrail,
  drawGraphPlot,
  Viewport,
} from './utils/canvasRenderer';
import {
  beautifyStrokePoints,
  stabilizePoint,
  SmoothingLevel,
} from './utils/strokeSmoother';
import { HubEntrance } from './components/HubEntrance';
import { Toolbar } from './components/Toolbar';
import { PageBar } from './components/PageBar';
import { VirtualRuler, VirtualProtractor } from './components/VirtualInstruments';
import { QuickMathModal } from './components/QuickMathModal';
import { GraphPlotModal } from './components/GraphPlotModal';
import { SettingsModal } from './components/SettingsModal';
import { ToolbarCustomizerModal } from './components/ToolbarCustomizerModal';
import { ChevronDown } from 'lucide-react';

const ALGEBRA_STORAGE_KEY = 'mathboard_algebra_pages_v3';
const GEOMETRY_STORAGE_KEY = 'mathboard_geometry_pages_v3';
const TOOLBAR_CUSTOM_KEY = 'mathboard_toolbar_custom_v2';
const TOOLBAR_POS_KEY = 'mathboard_toolbar_pos_v2';

const DEFAULT_TOOLBAR_CUSTOMIZATION: ToolbarCustomization = {
  pen: true,
  highlighter: true,
  eraser: true,
  shapes: true,
  axes: true,
  ruler: true,
  protractor: true,
  graphPlotter: true,
  quickMath: true,
  laser: true,
  pan: true,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active View: Hub Entrance or Canvas Board
  const [activeView, setActiveView] = useState<'hub' | 'board'>('hub');
  const [subjectMode, setSubjectMode] = useState<SubjectMode>('algebra');

  // Top PageBar Visibility
  const [isPageBarVisible, setIsPageBarVisible] = useState<boolean>(true);

  // Algebra Pages
  const [algebraPages, setAlgebraPages] = useState<PageData[]>(() => {
    try {
      const saved = localStorage.getItem(ALGEBRA_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load algebra pages:', e);
    }
    return [
      {
        id: 'algebra-page-1',
        title: 'Урок 1: Алгебра',
        strokes: [],
        mathElements: [],
        graphs: [],
        pan: { x: window.innerWidth ? window.innerWidth / 3 : 200, y: 150 },
        zoom: 1,
      },
    ];
  });

  // Geometry Pages
  const [geometryPages, setGeometryPages] = useState<PageData[]>(() => {
    try {
      const saved = localStorage.getItem(GEOMETRY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load geometry pages:', e);
    }
    return [
      {
        id: 'geometry-page-1',
        title: 'Урок 1: Геометрия',
        strokes: [],
        mathElements: [],
        graphs: [],
        pan: { x: window.innerWidth ? window.innerWidth / 3 : 200, y: 150 },
        zoom: 1,
      },
    ];
  });

  const [isBoardApiReady, setIsBoardApiReady] = useState(false);

  // Active page IDs
  const [currentAlgebraPageId, setCurrentAlgebraPageId] = useState<string>('algebra-page-1');
  const [currentGeometryPageId, setCurrentGeometryPageId] = useState<string>('geometry-page-1');

  // Currently active subject pages and current page
  const pages = subjectMode === 'algebra' ? algebraPages : geometryPages;
  const setPages = subjectMode === 'algebra' ? setAlgebraPages : setGeometryPages;
  const currentPageId = subjectMode === 'algebra' ? currentAlgebraPageId : currentGeometryPageId;
  const setCurrentPageId = subjectMode === 'algebra' ? setCurrentAlgebraPageId : setCurrentGeometryPageId;

  const currentPage = useMemo(
    () => pages.find((p) => p.id === currentPageId) || pages[0],
    [pages, currentPageId]
  );

  // Undo / Redo history for current page
  const [undoStack, setUndoStack] = useState<
    Array<{ strokes: Stroke[]; mathElements: MathElement[]; graphs: GraphPlot[] }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ strokes: Stroke[]; mathElements: MathElement[]; graphs: GraphPlot[] }>
  >([]);

  // Viewport (pan and zoom)
  const [pan, setPan] = useState<{ x: number; y: number }>(currentPage.pan || { x: 200, y: 150 });
  const [zoom, setZoom] = useState<number>(currentPage.zoom || 1);

  // Active Tool & Style State
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [color, setColor] = useState<string>('#1e3a8a');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [theme, setTheme] = useState<ThemeType>('notebook');
  const [baseCellSize, setBaseCellSize] = useState<number>(32);
  const [palmRejection, setPalmRejection] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);

  // Stroke Smoothing & Beautification Settings (Restored!)
  const [autoFormatEnabled, setAutoFormatEnabled] = useState<boolean>(true);
  const [smoothingLevel, setSmoothingLevel] = useState<SmoothingLevel>('aggressive');
  const [snapShapes, setSnapShapes] = useState<boolean>(true);

  // Geometry Instruments
  const [showRuler, setShowRuler] = useState<boolean>(false);
  const [showProtractor, setShowProtractor] = useState<boolean>(false);

  // Toolbar Floating Position & Customization
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(TOOLBAR_POS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth / 2 - 240) : 100,
      y: typeof window !== 'undefined' ? Math.max(40, window.innerHeight - 80) : 500,
    };
  });

  const [toolbarCustomization, setToolbarCustomization] = useState<ToolbarCustomization>(() => {
    try {
      const saved = localStorage.getItem(TOOLBAR_CUSTOM_KEY);
      if (saved) {
        return { ...DEFAULT_TOOLBAR_CUSTOMIZATION, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_TOOLBAR_CUSTOMIZATION;
  });

  // Modals state
  const [isQuickMathOpen, setIsQuickMathOpen] = useState(false);
  const [isGraphPlotOpen, setIsGraphPlotOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isToolbarCustomizerOpen, setIsToolbarCustomizerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live drawing tracking
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [laserPoints, setLaserPoints] = useState<LaserPoint[]>([]);

  // Panning with spacebar or middle mouse
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Multi-touch tracking for pinch-to-zoom
  const activePointersRef = useRef<Map<number, { x: number; y: number; isPen: boolean }>>(
    new Map()
  );
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // Update current page helper
  const updateCurrentPage = useCallback(
    (
      updater: (prev: PageData) => {
        strokes?: Stroke[];
        mathElements?: MathElement[];
        graphs?: GraphPlot[];
        pan?: { x: number; y: number };
        zoom?: number;
      }
    ) => {
      setPages((prevPages) =>
        prevPages.map((page) => {
          if (page.id !== currentPageId) return page;
          const updates = updater(page);
          return {
            ...page,
            ...updates,
          };
        })
      );
    },
    [currentPageId, setPages]
  );

  // Save pages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ALGEBRA_STORAGE_KEY, JSON.stringify(algebraPages));
    } catch (e) {
      console.warn('Failed to save algebra pages:', e);
    }
  }, [algebraPages]);

  useEffect(() => {
    try {
      localStorage.setItem(GEOMETRY_STORAGE_KEY, JSON.stringify(geometryPages));
    } catch (e) {
      console.warn('Failed to save geometry pages:', e);
    }
  }, [geometryPages]);

  useEffect(() => {
    let isActive = true;

    fetch('/api/board')
      .then((response) => {
        if (!response.ok) throw new Error(`Board load failed: ${response.status}`);
        return response.json();
      })
      .then((saved: { algebraPages?: PageData[] | null; geometryPages?: PageData[] | null }) => {
        if (!isActive) return;
        if (Array.isArray(saved.algebraPages) && saved.algebraPages.length > 0) {
          setAlgebraPages(saved.algebraPages);
        }
        if (Array.isArray(saved.geometryPages) && saved.geometryPages.length > 0) {
          setGeometryPages(saved.geometryPages);
        }
      })
      .catch((error) => console.warn('Failed to load board from API:', error))
      .finally(() => {
        if (isActive) setIsBoardApiReady(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isBoardApiReady) return;

    const timeoutId = window.setTimeout(() => {
      fetch('/api/board', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algebraPages, geometryPages }),
      }).then((response) => {
        if (!response.ok) throw new Error(`Board save failed: ${response.status}`);
      }).catch((error) => console.warn('Failed to save board to API:', error));
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [algebraPages, geometryPages, isBoardApiReady]);

  // Save toolbar pos & custom
  useEffect(() => {
    try {
      localStorage.setItem(TOOLBAR_POS_KEY, JSON.stringify(toolbarPos));
    } catch {}
  }, [toolbarPos]);

  useEffect(() => {
    try {
      localStorage.setItem(TOOLBAR_CUSTOM_KEY, JSON.stringify(toolbarCustomization));
    } catch {}
  }, [toolbarCustomization]);

  // Adjust default pen color when theme switches
  useEffect(() => {
    if (theme === 'chalkboard') {
      setColor('#ffffff');
    } else if (theme === 'blueprint') {
      setColor('#38bdf8');
    } else {
      setColor('#1e3a8a');
    }
  }, [theme]);

  // Push current page content to Undo stack before modification
  const pushUndoState = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-30),
      {
        strokes: [...currentPage.strokes],
        mathElements: [...currentPage.mathElements],
        graphs: [...currentPage.graphs],
      },
    ]);
    setRedoStack([]);
  }, [currentPage]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [
      ...prev,
      {
        strokes: [...currentPage.strokes],
        mathElements: [...currentPage.mathElements],
        graphs: [...currentPage.graphs],
      },
    ]);
    updateCurrentPage(() => ({
      strokes: previous.strokes,
      mathElements: previous.mathElements,
      graphs: previous.graphs,
    }));
  }, [undoStack, currentPage, updateCurrentPage]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [
      ...prev,
      {
        strokes: [...currentPage.strokes],
        mathElements: [...currentPage.mathElements],
        graphs: [...currentPage.graphs],
      },
    ]);
    updateCurrentPage(() => ({
      strokes: next.strokes,
      mathElements: next.mathElements,
      graphs: next.graphs,
    }));
  }, [redoStack, currentPage, updateCurrentPage]);

  // Convert screen coordinates to board world coordinates (with optional snap to grid)
  const screenToWorld = useCallback(
    (screenX: number, screenY: number, applySnap = false): { x: number; y: number } => {
      let wx = screenX / zoom - pan.x;
      let wy = screenY / zoom - pan.y;

      if (applySnap && snapToGrid && theme !== 'clean') {
        const step = baseCellSize / 2;
        wx = Math.round(wx / step) * step;
        wy = Math.round(wy / step) * step;
      }

      return { x: wx, y: wy };
    },
    [pan, zoom, snapToGrid, theme, baseCellSize]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        isSpacePressedRef.current = true;
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'p') {
        setCurrentTool('pen');
      } else if (e.key.toLowerCase() === 'h') {
        setCurrentTool('highlighter');
      } else if (e.key.toLowerCase() === 'e') {
        setCurrentTool('eraser');
      } else if (e.key.toLowerCase() === 'l') {
        setCurrentTool('laser');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    if (activeView === 'hub') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const viewport: Viewport = {
        pan,
        zoom,
        width,
        height,
      };

      // 1. Draw Infinite Squared Grid (or pure white)
      drawInfiniteGrid(ctx, viewport, theme, baseCellSize);

      // 2. Draw Math Function Plots (Algebra)
      currentPage.graphs.forEach((graph) => {
        drawGraphPlot(ctx, graph, viewport);
      });

      // 3. Draw Completed Strokes
      currentPage.strokes.forEach((stroke) => {
        drawStroke(ctx, stroke, viewport);
      });

      // 4. Draw Current Live Stroke
      if (currentStroke) {
        drawStroke(ctx, currentStroke, viewport);
      }

      // 5. Draw Laser Trail
      if (laserPoints.length > 0) {
        drawLaserTrail(ctx, laserPoints, viewport);
      }

      ctx.restore();

      if (laserPoints.length > 0) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    activeView,
    pan,
    zoom,
    theme,
    baseCellSize,
    currentPage.strokes,
    currentPage.graphs,
    currentStroke,
    laserPoints,
  ]);

  // Clean old laser points periodically
  useEffect(() => {
    if (laserPoints.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setLaserPoints((prev) => prev.filter((p) => now - p.time < 1200));
    }, 150);
    return () => clearInterval(interval);
  }, [laserPoints.length]);

  // Erase strokes intersecting target point
  const eraseAtPoint = (worldPt: Point) => {
    const eraseRadius = 18 / zoom;
    const survivingStrokes = currentPage.strokes.filter((stroke) => {
      return !stroke.points.some(
        (p) => Math.hypot(p.x - worldPt.x, p.y - worldPt.y) < eraseRadius
      );
    });

    if (survivingStrokes.length !== currentPage.strokes.length) {
      updateCurrentPage(() => ({
        strokes: survivingStrokes,
      }));
    }
  };

  // Pointer Event Handlers (Real-time stabilization & smoothing)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isPen = e.pointerType === 'pen';
    const isTouch = e.pointerType === 'touch';

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, isPen });

    // Handle 2-finger touch gesture: pinch zoom / pan
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      isPanningRef.current = false;
      setCurrentStroke(null);
      return;
    }

    const isFingerWithPalmRejection = isTouch && palmRejection && !isPen;
    const shouldPan =
      isSpacePressedRef.current ||
      e.button === 1 ||
      currentTool === 'pan' ||
      isFingerWithPalmRejection;

    if (shouldPan) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0 && !isTouch && !isPen) return;

    const isShape = ['line', 'dashed-line', 'arrow', 'rect', 'circle', 'triangle', 'right-triangle', 'axes'].includes(currentTool);
    const worldPt = screenToWorld(e.clientX, e.clientY, isShape);
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    const ptWithPressure = { ...worldPt, pressure, timestamp: Date.now() };

    // Laser pointer tool
    if (currentTool === 'laser') {
      setLaserPoints((prev) => [
        ...prev,
        { x: worldPt.x, y: worldPt.y, time: Date.now() },
      ]);
      return;
    }

    // Eraser tool
    if (currentTool === 'eraser') {
      pushUndoState();
      eraseAtPoint(worldPt);
      return;
    }

    // Pen, Highlighter, and Shapes
    pushUndoState();
    setCurrentStroke({
      id: `stroke-${Date.now()}`,
      tool: currentTool,
      color: currentTool === 'highlighter' ? '#facc15' : color,
      width: currentTool === 'highlighter' ? 18 : strokeWidth,
      opacity: currentTool === 'highlighter' ? 0.35 : 1,
      points: [ptWithPressure],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        isPen: e.pointerType === 'pen',
      });
    }

    // Handle 2-finger Pinch to Zoom & Pan
    if (activePointersRef.current.size === 2 && pinchStartDistRef.current !== null) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = dist / pinchStartDistRef.current;
      const newZoom = Math.min(5, Math.max(0.2, pinchStartZoomRef.current * scale));

      const center = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };

      const newPanX = pan.x + (center.x / newZoom - center.x / zoom);
      const newPanY = pan.y + (center.y / newZoom - center.y / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
      return;
    }

    // Handle 1-pointer Panning
    if (isPanningRef.current) {
      const dx = (e.clientX - panStartRef.current.x) / zoom;
      const dy = (e.clientY - panStartRef.current.y) / zoom;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const isShape = currentStroke && ['line', 'dashed-line', 'arrow', 'rect', 'circle', 'triangle', 'right-triangle', 'axes'].includes(currentStroke.tool);
    const worldPt = screenToWorld(e.clientX, e.clientY, !!isShape);
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    // Laser pointer
    if (currentTool === 'laser') {
      setLaserPoints((prev) => [
        ...prev.slice(-40),
        { x: worldPt.x, y: worldPt.y, time: Date.now() },
      ]);
      return;
    }

    // Eraser while dragging
    if (currentTool === 'eraser' && (e.buttons === 1 || e.pointerType === 'touch' || e.pointerType === 'pen')) {
      eraseAtPoint(worldPt);
      return;
    }

    // Active stroke drawing (with live moving average stabilization)
    if (currentStroke) {
      const prevPt =
        currentStroke.points.length > 0
          ? currentStroke.points[currentStroke.points.length - 1]
          : null;

      const liveWeight =
        smoothingLevel === 'aggressive'
          ? 0.58
          : smoothingLevel === 'strong'
          ? 0.48
          : smoothingLevel === 'medium'
          ? 0.38
          : 0.22;

      const smoothedPt =
        autoFormatEnabled && currentStroke.tool === 'pen' && prevPt && !isShape
          ? stabilizePoint(prevPt, { ...worldPt, pressure, timestamp: Date.now() }, liveWeight)
          : { ...worldPt, pressure, timestamp: Date.now() };

      if (isShape) {
        // For shapes: keep start point, update endpoint
        setCurrentStroke((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            points: [prev.points[0], smoothedPt],
          };
        });
      } else {
        // Freehand line: append smoothed point
        setCurrentStroke((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...prev.points, smoothedPt],
          };
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    // Finalize Current Stroke (Applies stroke smoothing and corner preservation without changing to text!)
    if (currentStroke && currentStroke.points.length > 0) {
      let finishedStroke = { ...currentStroke };
      setCurrentStroke(null);

      // Stroke smoothing & beautification (Douglas-Peucker + Chaikin + corner preservation)
      if (
        autoFormatEnabled &&
        finishedStroke.tool === 'pen' &&
        finishedStroke.points.length >= 3
      ) {
        finishedStroke.points = beautifyStrokePoints(finishedStroke.points, {
          snapShapes,
          smoothingLevel,
        });
      }

      const newStrokes = [...currentPage.strokes, finishedStroke];
      updateCurrentPage(() => ({ strokes: newStrokes }));
    }
  };

  // Mouse Wheel Zoom centered at cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(5, Math.max(0.2, zoom * zoomFactor));

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const newPanX = pan.x + (mouseX / newZoom - mouseX / zoom);
    const newPanY = pan.y + (mouseY / newZoom - mouseY / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Insert Quick Math Formula
  const handleInsertQuickMath = (latex: string) => {
    pushUndoState();
    const centerWorld = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    const newElement: MathElement = {
      id: `math-${Date.now()}`,
      x: Math.round(centerWorld.x - 60),
      y: Math.round(centerWorld.y - 40),
      latex,
      cleanText: latex,
      fontSize: 32,
      color: theme === 'chalkboard' || theme === 'blueprint' ? '#ffffff' : '#1e3a8a',
    };

    updateCurrentPage(() => ({
      mathElements: [...currentPage.mathElements, newElement],
    }));
  };

  // Insert Function Graph
  const handleInsertGraph = (formula: string, graphColor: string) => {
    pushUndoState();
    const centerWorld = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    const newGraph: GraphPlot = {
      id: `graph-${Date.now()}`,
      x: Math.round(centerWorld.x),
      y: Math.round(centerWorld.y),
      formula,
      color: graphColor,
      rangeX: [-6, 6],
      cellSize: baseCellSize,
    };

    updateCurrentPage(() => ({
      graphs: [...currentPage.graphs, newGraph],
    }));
  };

  // Switch between subjects
  const handleSwitchSubject = (mode: SubjectMode) => {
    setSubjectMode(mode);
    const targetPages = mode === 'algebra' ? algebraPages : geometryPages;
    const targetId = mode === 'algebra' ? currentAlgebraPageId : currentGeometryPageId;
    const p = targetPages.find((pg) => pg.id === targetId) || targetPages[0];
    if (p) {
      setPan(p.pan || { x: 200, y: 150 });
      setZoom(p.zoom || 1);
    }
  };

  // Page Operations
  const handleAddPage = () => {
    const newId = `${subjectMode}-page-${Date.now()}`;
    const newPage: PageData = {
      id: newId,
      title: `Стр. ${pages.length + 1}`,
      strokes: [],
      mathElements: [],
      graphs: [],
      pan: { x: window.innerWidth / 3, y: 150 },
      zoom: 1,
    };
    setPages((prev) => [...prev, newPage]);
    setCurrentPageId(newId);
    setPan(newPage.pan);
    setZoom(1);
  };

  const handleDeletePage = (id: string) => {
    if (pages.length <= 1) return;
    const remaining = pages.filter((p) => p.id !== id);
    setPages(remaining);
    if (currentPageId === id) {
      setCurrentPageId(remaining[0].id);
      setPan(remaining[0].pan);
      setZoom(remaining[0].zoom);
    }
  };

  const handleClearPage = () => {
    pushUndoState();
    updateCurrentPage(() => ({
      strokes: [],
      mathElements: [],
      graphs: [],
    }));
  };

  // Export to PNG Image
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `mathboard_${subjectMode}_${currentPage.title.replace(/\s+/g, '_')}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Fullscreen toggle for tablets
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isDark = theme === 'chalkboard' || theme === 'blueprint';

  return (
    <div
      ref={containerRef}
      className={`relative w-screen h-screen overflow-hidden select-none touch-none ${
        theme === 'chalkboard'
          ? 'bg-[#25443a]'
          : theme === 'blueprint'
          ? 'bg-[#0f172a]'
          : 'bg-[#ffffff]'
      }`}
    >
      {/* 1. Hub Entrance Screen (Choice between Algebra & Geometry) */}
      {activeView === 'hub' && (
        <HubEntrance
          onSelectSubject={(subj) => {
            handleSwitchSubject(subj);
            setActiveView('board');
          }}
          algebraPageCount={algebraPages.length}
          geometryPageCount={geometryPages.length}
        />
      )}

      {/* 2. Top Header & Page Tabs (with Collapse / Expand) */}
      {isPageBarVisible ? (
        <PageBar
          pages={pages}
          currentPageId={currentPageId}
          onSelectPage={(id) => {
            setCurrentPageId(id);
            const p = pages.find((pg) => pg.id === id);
            if (p) {
              setPan(p.pan || { x: 200, y: 150 });
              setZoom(p.zoom || 1);
            }
          }}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onClearPage={handleClearPage}
          zoom={zoom}
          onZoomIn={() => setZoom((z) => Math.min(5, z * 1.2))}
          onZoomOut={() => setZoom((z) => Math.max(0.2, z / 1.2))}
          onResetZoom={() => {
            setZoom(1);
            setPan({ x: window.innerWidth / 3, y: 150 });
          }}
          theme={theme}
          onExportPNG={handleExportPNG}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          subjectMode={subjectMode}
          onSwitchSubject={handleSwitchSubject}
          onOpenHub={() => setActiveView('hub')}
          snapToGrid={snapToGrid}
          onToggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
          onCollapse={() => setIsPageBarVisible(false)}
        />
      ) : (
        /* Floating Unfold Button when PageBar is hidden */
        <button
          onClick={() => setIsPageBarVisible(true)}
          title="Развернуть верхнюю панель"
          className={`fixed top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full shadow-lg border backdrop-blur-md transition hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-slate-900/90 border-slate-700 text-slate-200'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <ChevronDown className="w-4 h-4 text-blue-500 animate-bounce" />
          <span className="text-xs font-bold">
            {subjectMode === 'algebra' ? 'Алгебра' : 'Геометрия'} • {currentPage.title}
          </span>
        </button>
      )}

      {/* 3. Main Drawing Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full block cursor-${
          currentTool === 'pan'
            ? 'grab'
            : currentTool === 'laser'
            ? 'crosshair'
            : currentTool === 'eraser'
            ? 'cell'
            : 'crosshair'
        }`}
      />

      {/* 4. Geometry Virtual Instruments (Ruler & Protractor) */}
      {subjectMode === 'geometry' && (
        <>
          <VirtualRuler
            isOpen={showRuler}
            onClose={() => setShowRuler(false)}
            isDark={isDark}
          />
          <VirtualProtractor
            isOpen={showProtractor}
            onClose={() => setShowProtractor(false)}
            isDark={isDark}
          />
        </>
      )}

      {/* 5. Free Draggable Floating Toolbar */}
      <Toolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        color={color}
        onSelectColor={setColor}
        width={strokeWidth}
        onSelectWidth={setStrokeWidth}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        theme={theme}
        subjectMode={subjectMode}
        toolbarCustomization={toolbarCustomization}
        palmRejection={palmRejection}
        onTogglePalmRejection={() => setPalmRejection(!palmRejection)}
        showRuler={showRuler}
        onToggleRuler={() => setShowRuler(!showRuler)}
        showProtractor={showProtractor}
        onToggleProtractor={() => setShowProtractor(!showProtractor)}
        snapToGrid={snapToGrid}
        onToggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
        onOpenQuickMath={() => setIsQuickMathOpen(true)}
        onOpenGraphPlotter={() => setIsGraphPlotOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenToolbarCustomizer={() => setIsToolbarCustomizerOpen(true)}
        position={toolbarPos}
        onChangePosition={setToolbarPos}
      />

      {/* 6. Modals */}
      <QuickMathModal
        isOpen={isQuickMathOpen}
        onClose={() => setIsQuickMathOpen(false)}
        onInsertLatex={handleInsertQuickMath}
        theme={theme}
      />

      <GraphPlotModal
        isOpen={isGraphPlotOpen}
        onClose={() => setIsGraphPlotOpen(false)}
        onInsertGraph={handleInsertGraph}
        theme={theme}
      />

      <ToolbarCustomizerModal
        isOpen={isToolbarCustomizerOpen}
        onClose={() => setIsToolbarCustomizerOpen(false)}
        customization={toolbarCustomization}
        onChangeCustomization={(updater) => setToolbarCustomization(updater)}
        onResetDefault={() => setToolbarCustomization(DEFAULT_TOOLBAR_CUSTOMIZATION)}
        theme={theme}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onChangeTheme={setTheme}
        baseCellSize={baseCellSize}
        onChangeCellSize={setBaseCellSize}
        palmRejection={palmRejection}
        onTogglePalmRejection={() => setPalmRejection(!palmRejection)}
        autoFormatEnabled={autoFormatEnabled}
        onToggleAutoFormat={() => setAutoFormatEnabled(!autoFormatEnabled)}
        smoothingLevel={smoothingLevel}
        onChangeSmoothingLevel={setSmoothingLevel}
        snapShapes={snapShapes}
        onToggleSnapShapes={() => setSnapShapes(!snapShapes)}
        onResetToolbarPos={() =>
          setToolbarPos({
            x: Math.max(20, window.innerWidth / 2 - 240),
            y: Math.max(40, window.innerHeight - 80),
          })
        }
      />
    </div>
  );
}
