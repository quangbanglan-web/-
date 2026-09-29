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
import { Dashboard, DashboardBoard, DashboardSubject } from './components/Dashboard';
import { BoardHeader, BoardSaveStatus } from './components/BoardHeader';
import { Toolbar } from './components/Toolbar';
import { VirtualRuler, VirtualProtractor } from './components/VirtualInstruments';
import { QuickMathModal } from './components/QuickMathModal';
import { GraphPlotModal } from './components/GraphPlotModal';
import { SettingsModal } from './components/SettingsModal';
import { ToolbarCustomizerModal } from './components/ToolbarCustomizerModal';
import { AuthModal } from './components/AuthModal';
import { BottomBannerAd } from './components/ads/BottomBannerAd';
import { InterstitialAdModal } from './components/ads/InterstitialAdModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminPanel } from './components/AdminPanel';
import { TermsModal } from './components/legal/TermsModal';
import { PrivacyModal } from './components/legal/PrivacyModal';
import { ContactsModal } from './components/legal/ContactsModal';
import { User } from './types/auth';
import { authFetch, fetchCurrentUser, getStoredToken, removeStoredToken } from './utils/auth';
import { confirmSandboxPayment } from './utils/payment';
import { X, LoaderCircle } from 'lucide-react';

const ALGEBRA_STORAGE_KEY = 'mathboard_algebra_pages_v3';
const GEOMETRY_STORAGE_KEY = 'mathboard_geometry_pages_v3';
const CUSTOM_SUBJECTS_STORAGE_KEY = 'mathboard_custom_subjects_v1';
const TOOLBAR_CUSTOM_KEY = 'mathboard_toolbar_custom_v2';
const TOOLBAR_POS_KEY = 'mathboard_toolbar_pos_v2';

interface SavedBoardSummary {
  id: string;
  subject: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SavedBoardRecord extends SavedBoardSummary {
  data: SavedBoardData;
}

interface SavedBoardData {
  subjectMode?: SubjectMode;
  algebraPages?: PageData[];
  geometryPages?: PageData[];
  currentAlgebraPageId?: string;
  currentGeometryPageId?: string;
}

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

const DEFAULT_SUBJECTS: DashboardSubject[] = [
  { id: 'math', label: 'Математика', description: 'Формулы, вычисления и построения' },
  { id: 'physics', label: 'Физика', description: 'Задачи, схемы и эксперименты' },
  { id: 'informatics', label: 'Информатика', description: 'Алгоритмы и заметки' },
  { id: 'geography', label: 'География', description: 'Карты, темы и конспекты' },
  { id: 'history', label: 'История', description: 'Хронология и материалы уроков' },
  { id: 'geometry', label: 'Геометрия', description: 'Чертежи и геометрические построения' },
];

const createAutoTitle = (subjectLabel: string) => {
  const timestamp = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date()).replace(',', '');
  return `${subjectLabel} — Урок от ${timestamp}`;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const initialBoardId = useRef<string | null>(new URLSearchParams(window.location.search).get('id'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'board'>('dashboard');
  const [subjectMode, setSubjectMode] = useState<SubjectMode>('algebra');
  const [subjects, setSubjects] = useState<DashboardSubject[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOM_SUBJECTS_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) return [...DEFAULT_SUBJECTS, ...saved.filter((item) => item?.id && item?.label)];
    } catch {}
    return DEFAULT_SUBJECTS;
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState('math');
  const [boards, setBoards] = useState<SavedBoardSummary[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [activeBoard, setActiveBoard] = useState<{ id: string | null; subject: string; title: string } | null>(null);
  const [isInitialBoardLoading, setIsInitialBoardLoading] = useState(Boolean(initialBoardId.current));
  const [saveStatus, setSaveStatus] = useState<BoardSaveStatus>('saved');
  const dirtyRef = useRef(false);
  const saveBoardRef = useRef<() => Promise<boolean>>(async () => false);
  const [boardMessage, setBoardMessage] = useState('');

  // Ads & Subscription States
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isBottomBannerVisible, setIsBottomBannerVisible] = useState(false);
  const [pendingBoardIdToOpen, setPendingBoardIdToOpen] = useState<string | null>(null);
  const pendingBoardIdRef = useRef<string | null>(null);
  const [isInterstitialOpen, setIsInterstitialOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

  const handleLogout = useCallback(() => {
    removeStoredToken();
    setCurrentUser(null);
    setBoards([]);
    setActiveBoard(null);
    setActiveView('dashboard');
    setBoardUrl(null);
    setIsInterstitialOpen(false);
    setPendingBoardIdToOpen(null);
  }, []);

  // Check auth session on launch
  useEffect(() => {
    let isActive = true;
    const token = getStoredToken();
    if (!token) {
      setIsAuthChecking(false);
      return;
    }

    fetchCurrentUser()
      .then((user) => {
        if (isActive) setCurrentUser(user);
      })
      .catch(() => {
        if (isActive) setCurrentUser(null);
      })
      .finally(() => {
        if (isActive) setIsAuthChecking(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Handle return from YooKassa / sandbox payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mockPaymentId = urlParams.get('mock_payment_id');
    const paymentStatus = urlParams.get('payment');

    if (mockPaymentId || paymentStatus === 'success') {
      const finishPayment = async () => {
        if (mockPaymentId) {
          await confirmSandboxPayment(mockPaymentId, currentUser?.id);
        }

        const updated = await fetchCurrentUser();
        if (updated) {
          setCurrentUser(updated);
        }

        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('mock_payment_id');
        cleanUrl.searchParams.delete('payment');
        window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);

        setBoardMessage('Подписка DOSKA PRO успешно оформлена! Доступ ко всем возможностям открыт.');
      };

      finishPayment();
    }
  }, [currentUser?.id]);

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

  const markDirty = () => {
    if (!activeBoard) return;
    dirtyRef.current = true;
    setSaveStatus('unsaved');
  };

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

  const effectiveToolbarPos = useMemo(() => {
    if (!isBottomBannerVisible) return toolbarPos;
    const maxAllowedY = typeof window !== 'undefined' ? Math.max(40, window.innerHeight - 138) : toolbarPos.y;
    if (toolbarPos.y > maxAllowedY) {
      return { x: toolbarPos.x, y: maxAllowedY };
    }
    return toolbarPos;
  }, [toolbarPos, isBottomBannerVisible]);

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
      markDirty();
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
    [activeBoard, currentPageId, setPages]
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
    try {
      localStorage.setItem(CUSTOM_SUBJECTS_STORAGE_KEY, JSON.stringify(subjects.filter(
        (subject) => !DEFAULT_SUBJECTS.some((defaultSubject) => defaultSubject.id === subject.id)
      )));
    } catch {}
  }, [subjects]);

  const setBoardUrl = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('id', id);
    else url.searchParams.delete('id');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const makeEmptyPage = (mode: SubjectMode): PageData => ({
    id: `${mode}-page-${crypto.randomUUID()}`,
    title: 'Лист 1',
    strokes: [],
    mathElements: [],
    graphs: [],
    pan: { x: window.innerWidth / 3, y: 150 },
    zoom: 1,
  });

  const labelForSubject = (id: string) => subjects.find((subject) => subject.id === id)?.label || id;

  const activateBoard = (board: SavedBoardRecord) => {
    try {
      console.log('[activateBoard] Activating board:', board.id, board.title);
      let data = board.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error('[activateBoard] Failed to parse board.data JSON:', e);
          data = {};
        }
      }
      const mode: SubjectMode = board.subject === 'geometry' || data?.subjectMode === 'geometry'
        ? 'geometry'
        : 'algebra';
      const savedPages = mode === 'geometry' ? data?.geometryPages : data?.algebraPages;
      const restoredPages = Array.isArray(savedPages) && savedPages.length ? savedPages : [makeEmptyPage(mode)];
      const pageId = mode === 'geometry'
        ? data?.currentGeometryPageId || restoredPages[0].id
        : data?.currentAlgebraPageId || restoredPages[0].id;
      const restoredPage = restoredPages.find((page) => page.id === pageId) || restoredPages[0];

      setAlgebraPages(mode === 'algebra' ? restoredPages : []);
      setGeometryPages(mode === 'geometry' ? restoredPages : []);
      setCurrentAlgebraPageId(mode === 'algebra' ? pageId : '');
      setCurrentGeometryPageId(mode === 'geometry' ? pageId : '');
      setSubjectMode(mode);
      setPan(restoredPage.pan || { x: 200, y: 150 });
      setZoom(restoredPage.zoom || 1);
      setUndoStack([]);
      setRedoStack([]);
      setActiveBoard({ id: board.id, subject: board.subject, title: board.title });
      setSelectedSubjectId(board.subject);
      setSubjects((existing) => existing.some((subject) => subject.id === board.subject)
        ? existing
        : [...existing, { id: board.subject, label: board.subject }]);
      dirtyRef.current = false;
      setSaveStatus('saved');
      setBoardUrl(board.id);
      setActiveView('board');
      console.log('[activateBoard] Switched activeView to board successfully!');
    } catch (err) {
      console.error('[activateBoard] Error activating board:', err);
      setBoardMessage('Ошибка при загрузке доски на холст');
    }
  };

  useEffect(() => {
    if (activeView !== 'dashboard' || !currentUser) return;
    let isActive = true;
    setIsLoadingBoards(true);
    authFetch(`/api/boards?subject=${encodeURIComponent(selectedSubjectId)}`, {}, handleLogout)
      .then((response) => {
        if (!response.ok) throw new Error(`Ошибка загрузки списка: ${response.status}`);
        return response.json();
      })
      .then((result: SavedBoardSummary[]) => {
        if (isActive) setBoards(result);
      })
      .catch((error: Error) => {
        if (isActive) setBoardMessage(error.message);
      })
      .finally(() => {
        if (isActive) setIsLoadingBoards(false);
      });
    return () => { isActive = false; };
  }, [activeView, selectedSubjectId, currentUser, handleLogout]);

  useEffect(() => {
    const boardId = initialBoardId.current;
    if (!boardId || !currentUser) {
      if (!boardId) setIsInitialBoardLoading(false);
      return;
    }
    let isActive = true;
    authFetch(`/api/boards/${encodeURIComponent(boardId)}`, {}, handleLogout)
      .then((response) => {
        if (!response.ok) throw new Error(response.status === 404 ? 'Доска не найдена' : `Ошибка загрузки: ${response.status}`);
        return response.json();
      })
      .then((board: SavedBoardRecord) => {
        if (isActive) activateBoard(board);
      })
      .catch((error: Error) => {
        if (!isActive) return;
        setBoardMessage(error.message);
        setActiveView('dashboard');
        setBoardUrl(null);
      })
      .finally(() => {
        if (isActive) setIsInitialBoardLoading(false);
      });
    return () => { isActive = false; };
  }, [currentUser, handleLogout]);

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
    if (activeView !== 'board') return;
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

      markDirty();
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
      return;
    }

    // Handle 1-pointer Panning
    if (isPanningRef.current) {
      const dx = (e.clientX - panStartRef.current.x) / zoom;
      const dy = (e.clientY - panStartRef.current.y) / zoom;
      markDirty();
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

    markDirty();
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

  const handleSaveBoard = async (): Promise<boolean> => {
    if (!activeBoard || !currentPage) return false;
    setSaveStatus('saving');
    const id = activeBoard.id || crypto.randomUUID();
    const persistedPages = pages.map((page) => page.id === currentPageId ? { ...page, pan, zoom } : page);
    const data: SavedBoardData = {
      subjectMode,
      algebraPages: subjectMode === 'algebra' ? persistedPages : [],
      geometryPages: subjectMode === 'geometry' ? persistedPages : [],
      currentAlgebraPageId: subjectMode === 'algebra' ? currentPageId : undefined,
      currentGeometryPageId: subjectMode === 'geometry' ? currentPageId : undefined,
    };

    try {
      const response = await authFetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, subject: activeBoard.subject, title: activeBoard.title, data }),
      }, handleLogout);
      if (!response.ok) throw new Error(`Ошибка сохранения: ${response.status}`);
      const saved = await response.json() as { title: string };
      setActiveBoard((current) => current ? { ...current, id, title: saved.title } : current);
      setBoardUrl(id);
      dirtyRef.current = false;
      setSaveStatus('saved');
      return true;
    } catch (error) {
      setSaveStatus('error');
      setBoardMessage(error instanceof Error ? error.message : 'Не удалось сохранить доску');
      return false;
    }
  };
  saveBoardRef.current = handleSaveBoard;

  useEffect(() => {
    if (activeView !== 'board' || !activeBoard) return;
    const intervalId = window.setInterval(() => {
      if (dirtyRef.current) void saveBoardRef.current();
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [activeView, activeBoard?.id, activeBoard?.subject]);

  const handleRenameActiveBoard = async (title: string) => {
    if (!activeBoard) return;
    if (activeBoard.id) {
      try {
        const response = await authFetch(`/api/boards/${encodeURIComponent(activeBoard.id)}/rename`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        }, handleLogout);
        if (!response.ok) {
          const message = await response.json().catch(() => ({}));
          throw new Error(message.error || `Ошибка переименования: ${response.status}`);
        }
      } catch (error) {
        setBoardMessage(error instanceof Error ? error.message : 'Не удалось переименовать доску');
        throw error;
      }
    } else {
      markDirty();
    }
    setActiveBoard((current) => current ? { ...current, title } : current);
  };

  const handleLoadBoard = useCallback(async (id: string) => {
    try {
      console.log('[handleLoadBoard] Fetching board from server:', id);
      const response = await authFetch(`/api/boards/${encodeURIComponent(id)}`, {}, handleLogout);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[handleLoadBoard] Server error response:', response.status, errText);
        throw new Error(response.status === 404 ? 'Доска не найдена' : `Ошибка загрузки (${response.status})`);
      }
      const boardData = (await response.json()) as SavedBoardRecord;
      console.log('[handleLoadBoard] Received board from server:', boardData.id, boardData.title);
      activateBoard(boardData);
    } catch (error) {
      console.error('[handleLoadBoard] Exception loading board:', error);
      setBoardMessage(error instanceof Error ? error.message : 'Не удалось загрузить доску');
      setActiveView('dashboard');
    }
  }, [handleLogout]);

  const handleRequestOpenBoard = (id: string) => {
    console.log('[handleRequestOpenBoard] Requested to open board:', id, 'is_pro:', currentUser?.is_pro);
    if (currentUser?.is_pro) {
      void handleLoadBoard(id);
    } else {
      pendingBoardIdRef.current = id;
      setPendingBoardIdToOpen(id);
      setIsInterstitialOpen(true);
    }
  };

  const handleProceedFromInterstitial = useCallback(() => {
    console.log('[handleProceedFromInterstitial] Proceeding from interstitial to load board');
    setIsInterstitialOpen(false);
    const targetId = pendingBoardIdRef.current || pendingBoardIdToOpen;
    if (targetId) {
      pendingBoardIdRef.current = null;
      setPendingBoardIdToOpen(null);
      void handleLoadBoard(targetId);
    } else {
      console.warn('[handleProceedFromInterstitial] No pending board ID found');
    }
  }, [pendingBoardIdToOpen, handleLoadBoard]);

  const handleSuccessUpgrade = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setIsSubscriptionModalOpen(false);
    setIsInterstitialOpen(false);
    setBoardMessage('Поздравляем! Подписка DOSKA PRO активирована. Вся реклама отключена!');
  };

  const handleCreateBoard = (subjectId = selectedSubjectId) => {
    const mode: SubjectMode = subjectId === 'geometry' ? 'geometry' : 'algebra';
    const subjectLabel = labelForSubject(subjectId);
    const newPage = makeEmptyPage(mode);
    setAlgebraPages(mode === 'algebra' ? [newPage] : []);
    setGeometryPages(mode === 'geometry' ? [newPage] : []);
    setCurrentAlgebraPageId(mode === 'algebra' ? newPage.id : '');
    setCurrentGeometryPageId(mode === 'geometry' ? newPage.id : '');
    setSubjectMode(mode);
    setPan(newPage.pan);
    setZoom(1);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedSubjectId(subjectId);
    setActiveBoard({ id: null, subject: subjectId, title: createAutoTitle(subjectLabel) });
    dirtyRef.current = true;
    setSaveStatus('unsaved');
    setBoardUrl(null);
    setActiveView('board');
  };

  const handleReturnToDashboard = async () => {
    if (activeBoard && (dirtyRef.current || !activeBoard.id)) {
      const saved = await handleSaveBoard();
      if (!saved) return;
    }
    if (activeBoard) setSelectedSubjectId(activeBoard.subject);
    setActiveView('dashboard');
    setActiveBoard(null);
    setBoardUrl(null);
    setIsQuickMathOpen(false);
    setIsGraphPlotOpen(false);
    setIsSettingsOpen(false);
    setIsToolbarCustomizerOpen(false);
    setShowRuler(false);
    setShowProtractor(false);
  };

  const handleRenameSavedBoard = async (id: string, title: string) => {
    const response = await authFetch(`/api/boards/${encodeURIComponent(id)}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }, handleLogout);
    if (!response.ok) throw new Error(`Ошибка переименования: ${response.status}`);
    setBoards((existing) => existing.map((board) => board.id === id ? { ...board, title } : board));
  };

  const handleDeleteSavedBoard = async (id: string) => {
    const response = await authFetch(`/api/boards/${encodeURIComponent(id)}`, { method: 'DELETE' }, handleLogout);
    if (!response.ok) throw new Error(`Ошибка удаления: ${response.status}`);
    setBoards((existing) => existing.filter((board) => board.id !== id));
  };

  const handleAddSubject = (label: string) => {
    const subject = { id: `custom-${crypto.randomUUID()}`, label };
    setSubjects((existing) => [...existing, subject]);
    setSelectedSubjectId(subject.id);
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
    markDirty();
  };

  const handleDeletePage = (id: string) => {
    if (pages.length <= 1) return;
    const remaining = pages.filter((p) => p.id !== id);
    setPages(remaining);
    markDirty();
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

  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f2f6f3]">
        <div className="flex flex-col items-center gap-3 text-emerald-900">
          <LoaderCircle className="h-8 w-8 animate-spin text-emerald-800" />
          <p className="text-sm font-semibold tracking-wide">Инициализация рабочей среды...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthModal
          onSuccess={(user) => setCurrentUser(user)}
          onOpenTerms={() => setIsTermsModalOpen(true)}
          onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          onOpenContacts={() => setIsContactsModalOpen(true)}
        />
        <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
        <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
        <ContactsModal isOpen={isContactsModalOpen} onClose={() => setIsContactsModalOpen(false)} />
      </>
    );
  }

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
      {activeView === 'dashboard' && (isInitialBoardLoading ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#f2f6f3] text-sm font-semibold text-emerald-900">Открываем доску...</div>
      ) : (
        <Dashboard
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          boards={boards}
          isLoading={isLoadingBoards}
          currentUser={currentUser}
          onSelectSubject={setSelectedSubjectId}
          onCreateBoard={() => handleCreateBoard(selectedSubjectId)}
          onOpenBoard={handleRequestOpenBoard}
          onRenameBoard={handleRenameSavedBoard}
          onDeleteBoard={handleDeleteSavedBoard}
          onAddSubject={handleAddSubject}
          onLogout={handleLogout}
          onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
          onOpenAdmin={() => setIsAdminPanelOpen(true)}
          onOpenTerms={() => setIsTermsModalOpen(true)}
          onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          onOpenContacts={() => setIsContactsModalOpen(true)}
        />
      ))}

      {activeView === 'board' && activeBoard && (
        <BoardHeader
          subjectLabel={labelForSubject(activeBoard.subject)}
          title={activeBoard.title}
          saveStatus={saveStatus}
          pages={pages}
          currentPageId={currentPageId}
          theme={theme}
          zoom={zoom}
          isFullscreen={isFullscreen}
          onBack={() => { void handleReturnToDashboard(); }}
          onRename={handleRenameActiveBoard}
          onSave={() => { void handleSaveBoard(); }}
          onSelectPage={(id) => {
            setCurrentPageId(id);
            const page = pages.find((item) => item.id === id);
            if (!page) return;
            setPan(page.pan || { x: 200, y: 150 });
            setZoom(page.zoom || 1);
            markDirty();
          }}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onZoomIn={() => { markDirty(); setZoom((value) => Math.min(5, value * 1.2)); }}
          onZoomOut={() => { markDirty(); setZoom((value) => Math.max(0.2, value / 1.2)); }}
          onResetZoom={() => { markDirty(); setZoom(1); setPan({ x: window.innerWidth / 3, y: 150 }); }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onClearPage={handleClearPage}
          onExportPNG={handleExportPNG}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {boardMessage && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          {boardMessage}
          <button onClick={() => setBoardMessage('')} className="ml-3 text-slate-300 hover:text-white" aria-label="Закрыть сообщение">
            <X className="inline h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {activeView === 'board' && (
        <>
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
        position={effectiveToolbarPos}
        onChangePosition={(pos) => {
          if (isBottomBannerVisible) {
            const maxAllowedY = typeof window !== 'undefined' ? Math.max(40, window.innerHeight - 138) : pos.y;
            setToolbarPos({ x: pos.x, y: Math.min(pos.y, maxAllowedY) });
          } else {
            setToolbarPos(pos);
          }
        }}
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
            y: Math.max(40, window.innerHeight - (isBottomBannerVisible ? 140 : 80)),
          })
        }
      />
        </>
      )}

      {/* 7. Ads and Subscription Modals */}
      <BottomBannerAd
        isPro={Boolean(currentUser?.is_pro)}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        onVisibilityChange={setIsBottomBannerVisible}
      />

      <InterstitialAdModal
        isOpen={isInterstitialOpen}
        isPro={Boolean(currentUser?.is_pro)}
        boardTitle={boards.find((b) => b.id === pendingBoardIdToOpen)?.title || 'Урок'}
        onProceed={handleProceedFromInterstitial}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        currentUser={currentUser}
        onSuccessUpgrade={handleSuccessUpgrade}
        onOpenTerms={() => setIsTermsModalOpen(true)}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        currentUser={currentUser}
        onCurrentUserUpdated={(updated) => setCurrentUser(updated)}
      />

      {/* Legal Modals */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      <ContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
      />
    </div>
  );
}
