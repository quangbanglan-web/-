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
  BoardBackground,
  SubjectMode,
  ToolbarCustomization,
  EraserMode,
} from './types/board';
import {
  drawInfiniteGrid,
  drawBoardBackground,
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
import { BoardHeader, BoardSaveStatus, ExportFormat } from './components/BoardHeader';
import { SlidesBar } from './components/SlidesBar';
import { Toolbar } from './components/Toolbar';
import { VirtualRuler, VirtualProtractor } from './components/VirtualInstruments';
import { QuickMathModal } from './components/QuickMathModal';
import { GraphPlotModal } from './components/GraphPlotModal';
import { SettingsModal } from './components/SettingsModal';
import { ToolbarCustomizerModal } from './components/ToolbarCustomizerModal';
import { AuthModal } from './components/AuthModal';
import { AdBanner } from './components/ads/AdBanner';
import { InterstitialAdModal } from './components/ads/InterstitialAdModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { useTheme } from './contexts/ThemeContext';
import { AdminPanel } from './components/AdminPanel';
import { TermsModal } from './components/legal/TermsModal';
import { PrivacyModal } from './components/legal/PrivacyModal';
import { ContactsModal } from './components/legal/ContactsModal';
import { MathCard } from './components/MathCard';
import { CreateBoardModal } from './components/CreateBoardModal';
import { ProfileModal } from './components/ProfileModal';
import { BoardLimitModal } from './components/BoardLimitModal';
import { convertPdfToPages, PdfImportProgress } from './utils/pdfImporter';
import { User } from './types/auth';
import { authFetch, fetchCurrentUser, getStoredToken, removeStoredToken } from './utils/auth';
import { confirmSandboxPayment } from './utils/payment';
import { generateId } from './utils/uuid';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';
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

const isPointNearStroke = (stroke: Stroke, point: Point, radius: number): boolean => {
  const points = stroke.points;
  if (!points.length) return false;
  const tool = stroke.tool;
  const shapeTools = [
    'line',
    'dashed-line',
    'arrow',
    'double-arrow',
    'rect',
    'square',
    'circle',
    'ellipse',
    'triangle',
    'right-triangle',
    'axes',
    'trapezoid',
    'right-trapezoid',
    'parallelogram',
    'rhombus',
    'box3d',
    'cube3d',
    'cylinder3d',
    'cone3d',
    'pyramid3d',
  ];

  const distanceToSegment = (start: Point, end: Point) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared
      ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
      : 0;
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
  };

  const isPointInPoly = (pt: Point, poly: Point[]) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersect =
        yi > pt.y !== yj > pt.y &&
        pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  if (shapeTools.includes(tool) && points.length >= 2) {
    const start = points[0];
    const end = points[points.length - 1];
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y);
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    if (tool === 'line' || tool === 'dashed-line') {
      return distanceToSegment(start, end) <= radius;
    }

    if (tool === 'arrow' || tool === 'double-arrow') {
      if (distanceToSegment(start, end) <= radius) return true;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = Math.max(16, stroke.width * 3.5);
      const p1 = {
        x: end.x - headLen * Math.cos(angle - Math.PI / 6),
        y: end.y - headLen * Math.sin(angle - Math.PI / 6),
      };
      const p2 = {
        x: end.x - headLen * Math.cos(angle + Math.PI / 6),
        y: end.y - headLen * Math.sin(angle + Math.PI / 6),
      };
      if (
        distanceToSegment(end, p1) <= radius ||
        distanceToSegment(end, p2) <= radius ||
        distanceToSegment(p1, p2) <= radius ||
        isPointInPoly(point, [end, p1, p2])
      ) return true;

      if (tool === 'double-arrow') {
        const p3 = {
          x: start.x + headLen * Math.cos(angle - Math.PI / 6),
          y: start.y + headLen * Math.sin(angle - Math.PI / 6),
        };
        const p4 = {
          x: start.x + headLen * Math.cos(angle + Math.PI / 6),
          y: start.y + headLen * Math.sin(angle + Math.PI / 6),
        };
        if (
          distanceToSegment(start, p3) <= radius ||
          distanceToSegment(start, p4) <= radius ||
          distanceToSegment(p3, p4) <= radius ||
          isPointInPoly(point, [start, p3, p4])
        ) return true;
      }
    }

    if (tool === 'rect' || tool === 'square') {
      const rectEdges: [Point, Point][] = [
        [{ x: left, y: top }, { x: right, y: top }],
        [{ x: right, y: top }, { x: right, y: bottom }],
        [{ x: right, y: bottom }, { x: left, y: bottom }],
        [{ x: left, y: bottom }, { x: left, y: top }],
      ];
      if (rectEdges.some(([p1, p2]) => distanceToSegment(p1, p2) <= radius)) return true;
      return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
    }

    if (tool === 'circle' || tool === 'ellipse') {
      const rx = width / 2;
      const ry = height / 2;
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      if (Math.hypot(point.x - cx, point.y - cy) <= Math.max(radius, 6)) return true;
      if (((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2 <= 1) return true;
      const angle = Math.atan2((point.y - cy) / ry, (point.x - cx) / rx);
      const closestPt = {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      };
      return Math.hypot(point.x - closestPt.x, point.y - closestPt.y) <= radius;
    }

    if (tool === 'triangle') {
      const poly = [{ x: (left + right) / 2, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
      if (isPointInPoly(point, poly)) return true;
      const edges: [Point, Point][] = [
        [poly[0], poly[1]],
        [poly[1], poly[2]],
        [poly[2], poly[0]],
      ];
      return edges.some(([p1, p2]) => distanceToSegment(p1, p2) <= radius);
    }

    if (tool === 'right-triangle') {
      const poly = [{ x: left, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
      if (isPointInPoly(point, poly)) return true;
      const edges: [Point, Point][] = [
        [poly[0], poly[1]],
        [poly[1], poly[2]],
        [poly[2], poly[0]],
      ];
      return edges.some(([p1, p2]) => distanceToSegment(p1, p2) <= radius);
    }

    if (tool === 'axes') {
      const cx = start.x;
      const cy = start.y;
      const r = Math.max(80, Math.hypot(end.x - start.x, end.y - start.y));
      if (distanceToSegment({ x: cx - r, y: cy }, { x: cx + r, y: cy }) <= radius) return true;
      if (distanceToSegment({ x: cx, y: cy - r }, { x: cx, y: cy + r }) <= radius) return true;
      if (Math.hypot(point.x - cx, point.y - cy) <= radius * 2) return true;
      return false;
    }

    if (tool === 'trapezoid') {
      const inset = width * 0.2;
      const poly = [
        { x: left + inset, y: top },
        { x: right - inset, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];
      if (isPointInPoly(point, poly)) return true;
      const edges: [Point, Point][] = [
        [poly[0], poly[1]],
        [poly[1], poly[2]],
        [poly[2], poly[3]],
        [poly[3], poly[0]],
      ];
      return edges.some(([p1, p2]) => distanceToSegment(p1, p2) <= radius);
    }

    if (tool === 'right-trapezoid') {
      const poly = [
        { x: left, y: top },
        { x: left + width * 0.6, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];
      if (isPointInPoly(point, poly)) return true;
      const edges: [Point, Point][] = [
        [poly[0], poly[1]],
        [poly[1], poly[2]],
        [poly[2], poly[3]],
        [poly[3], poly[0]],
      ];
      return edges.some(([p1, p2]) => distanceToSegment(p1, p2) <= radius);
    }

    if (tool === 'parallelogram') {
      const shiftX = width * 0.25;
      const poly = [
        { x: left + shiftX, y: top },
        { x: right, y: top },
        { x: right - shiftX, y: bottom },
        { x: left, y: bottom },
      ];
      if (isPointInPoly(point, poly)) return true;
      const edges: [Point, Point][] = [
        [poly[0], poly[1]],
        [poly[1], poly[2]],
        [poly[2], poly[3]],
        [poly[3], poly[0]],
      ];
      return edges.some(([p1, p2]) => distanceToSegment(p1, p2) <= radius);
    }

    if (tool === 'rhombus') {
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      const poly = [
        { x: cx, y: top },
        { x: right, y: cy },
        { x: cx, y: bottom },
        { x: left, y: cy },
      ];
      if (isPointInPoly(point, poly)) return true;
      const edges: [Point, Point][] = [
        [poly[0], poly[1]],
        [poly[1], poly[2]],
        [poly[2], poly[3]],
        [poly[3], poly[0]],
      ];
      return edges.some(([p1, p2]) => distanceToSegment(p1, p2) <= radius);
    }

    if (tool === 'box3d' || tool === 'cube3d') {
      const depth = Math.min(width, height) * 0.35;
      const ox = depth * 0.7;
      const oy = -depth * 0.5;
      if (
        point.x >= left - radius &&
        point.x <= right + ox + radius &&
        point.y >= top + oy - radius &&
        point.y <= bottom + radius
      ) {
        return true;
      }
    }

    if (tool === 'cylinder3d') {
      if (
        point.x >= left - radius &&
        point.x <= right + radius &&
        point.y >= top - radius &&
        point.y <= bottom + radius
      ) {
        return true;
      }
    }

    if (tool === 'pyramid3d' || tool === 'cone3d') {
      if (
        point.x >= left - radius &&
        point.x <= right + radius &&
        point.y >= top - radius &&
        point.y <= bottom + radius
      ) {
        return true;
      }
    }
  }

  // Freehand stroke or fallback
  for (let i = 1; i < points.length; i++) {
    if (distanceToSegment(points[i - 1], points[i]) <= radius) return true;
  }
  if (points.length === 1) {
    return Math.hypot(points[0].x - point.x, points[0].y - point.y) <= radius;
  }
  return false;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const initialBoardId = useRef<string | null>(
    new URLSearchParams(window.location.search).get('id') ||
    window.location.pathname.match(/\/board\/([^/?#]+)/)?.[1] ||
    null
  );
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

  // Guest Mode, 1-Board Limit & Auth Modals
  const [allUserBoards, setAllUserBoards] = useState<SavedBoardSummary[]>([]);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [isBoardLimitModalOpen, setIsBoardLimitModalOpen] = useState(false);
  const [pendingCreateAction, setPendingCreateAction] = useState<(() => void) | null>(null);

  // PDF import state
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const [pdfImportProgress, setPdfImportProgress] = useState<PdfImportProgress>({ currentPage: 0, totalPages: 0 });

  const handleLogout = useCallback(() => {
    removeStoredToken();
    setCurrentUser(null);
    setBoards([]);
    setAllUserBoards([]);
    setActiveBoard(null);
    setActiveView('dashboard');
    setBoardUrl(null);
    setIsInterstitialOpen(false);
    setPendingBoardIdToOpen(null);
    setIsGuest(false);
  }, []);

  // Check auth session on launch and OAuth redirects
  useEffect(() => {
    let isActive = true;
    const url = new URL(window.location.href);
    const oauthToken = url.searchParams.get('token');
    const authStatus = url.searchParams.get('auth');
    const oauthError = url.searchParams.get('oauth_error');

    if (oauthToken && authStatus === 'success') {
      localStorage.setItem('auth_token', oauthToken);
      url.searchParams.delete('token');
      url.searchParams.delete('auth');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      fetchCurrentUser()
        .then((user) => {
          if (isActive && user) {
            setCurrentUser(user);
            setBoardMessage(`Добро пожаловать, ${user.name}!`);
          }
        })
        .finally(() => {
          if (isActive) setIsAuthChecking(false);
        });
      return () => {
        isActive = false;
      };
    }

    if (oauthError) {
      url.searchParams.delete('oauth_error');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      if (oauthError === 'yandex_not_configured') {
        setBoardMessage('Вход через Яндекс ID временно не настроен на сервере');
      } else if (oauthError === 'vk_not_configured') {
        setBoardMessage('Вход через VK ID временно не настроен на сервере');
      } else {
        setBoardMessage('Ошибка авторизации через внешнюю службу');
      }
    }

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

  // Handle return from YooKassa payment (?payment=success)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mockPaymentId = urlParams.get('mock_payment_id');
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success' || mockPaymentId) {
      const finishPayment = async () => {
        if (mockPaymentId) {
          await confirmSandboxPayment(mockPaymentId, currentUser?.id);
        }

        // Очистить query параметры из адресной строки чтобы при F5 не показывалось повторно
        window.history.replaceState({}, '', window.location.pathname);

        // Обновить данные текущего пользователя чтобы сразу отобразить PRO без перезагрузки
        const updated = await fetchCurrentUser();
        if (updated) {
          setCurrentUser(updated);
        }

        // Дополнительная проверка на случай сетевой задержки вебхука ЮKassa
        if (!updated?.is_pro) {
          setTimeout(async () => {
            const recheck = await fetchCurrentUser();
            if (recheck?.is_pro) {
              setCurrentUser(recheck);
            }
          }, 1500);
        }

        setBoardMessage('Оплата прошла успешно! PRO-аккаунт активирован на 30 дней.');
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

  const currentPage = useMemo<PageData>(() => {
    const found = pages.find((p) => p.id === currentPageId) || pages[0];
    if (found) {
      return {
        ...found,
        strokes: Array.isArray(found.strokes) ? found.strokes : [],
        mathElements: Array.isArray(found.mathElements) ? found.mathElements : [],
        graphs: Array.isArray(found.graphs) ? found.graphs : [],
        pan: found.pan && typeof found.pan.x === 'number' && typeof found.pan.y === 'number'
          ? found.pan
          : { x: window.innerWidth ? window.innerWidth / 3 : 200, y: 150 },
        zoom: typeof found.zoom === 'number' && found.zoom > 0 ? found.zoom : 1,
      };
    }
    return {
      id: `${subjectMode}-page-fallback`,
      title: 'Лист 1',
      strokes: [],
      mathElements: [],
      graphs: [],
      pan: { x: window.innerWidth ? window.innerWidth / 3 : 200, y: 150 },
      zoom: 1,
    };
  }, [pages, currentPageId, subjectMode]);

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
  const [baseCellSize, setBaseCellSize] = useState<number>(32);
  const { resolvedTheme, setTheme: setGlobalTheme, theme: globalTheme } = useTheme();
  const [theme, setTheme] = useState<ThemeType>('notebook');
  
  useEffect(() => {
    setTheme(resolvedTheme === 'dark' ? 'chalkboard' : 'notebook');
  }, [resolvedTheme]);
  const [palmRejection, setPalmRejection] = useState<boolean>(false);
  const [eraserMode, setEraserMode] = useState<EraserMode>('stroke');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const lastPenTimeRef = useRef<number>(0);

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
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live drawing tracking
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [laserPoints, setLaserPoints] = useState<LaserPoint[]>([]);

  // Panning with spacebar or middle mouse
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const isErasingRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-dismiss toast messages
  useEffect(() => {
    if (!boardMessage) return;
    const timer = setTimeout(() => {
      setBoardMessage('');
    }, 3500);
    return () => clearTimeout(timer);
  }, [boardMessage]);

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
        background?: BoardBackground;
      }
    ) => {
      setPages((prevPages) => {
        let changed = false;
        const nextPages = prevPages.map((page) => {
          if (page.id !== currentPageId) return page;
          const updates = updater(page);
          if (Object.keys(updates).length === 0) return page;
          changed = true;
          return {
            ...page,
            ...updates,
          };
        });
        if (changed) markDirty();
        return changed ? nextPages : prevPages;
      });
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

  const makeEmptyPage = (mode: SubjectMode, background: BoardBackground = 'grid'): PageData => ({
    id: `${mode}-page-${generateId()}`,
    title: 'Лист 1',
    strokes: [],
    mathElements: [],
    graphs: [],
    pan: { x: window.innerWidth / 3, y: 150 },
    zoom: 1,
    background,
  });

  const labelForSubject = (id: string) => subjects.find((subject) => subject.id === id)?.label || id;

  const activateBoard = (board: SavedBoardRecord) => {
    try {
      console.log('Opening board ID:', board.id);
      console.log('Board fetched:', board.data || board);
      let data: any = board.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error('[activateBoard] Failed to parse board.data JSON:', e);
          data = {};
        }
      }
      if (!data || typeof data !== 'object') {
        data = {};
      }

      const mode: SubjectMode = board.subject === 'geometry' || data?.subjectMode === 'geometry'
        ? 'geometry'
        : 'algebra';
      const rawPages = mode === 'geometry' ? data?.geometryPages : data?.algebraPages;
      const validPages: PageData[] = Array.isArray(rawPages) && rawPages.length > 0
        ? rawPages.map((p: any, idx: number) => ({
            id: typeof p?.id === 'string' && p.id ? p.id : `${mode}-page-${idx + 1}`,
            title: typeof p?.title === 'string' && p.title ? p.title : `Лист ${idx + 1}`,
            strokes: Array.isArray(p?.strokes) ? p.strokes : [],
            mathElements: Array.isArray(p?.mathElements) ? p.mathElements : [],
            graphs: Array.isArray(p?.graphs) ? p.graphs : [],
            pan: p?.pan && typeof p.pan.x === 'number' && typeof p.pan.y === 'number'
              ? p.pan
              : { x: window.innerWidth ? window.innerWidth / 3 : 200, y: 150 },
            zoom: typeof p?.zoom === 'number' && p.zoom > 0 ? p.zoom : 1,
            background: typeof p?.background === 'string' ? p.background : 'grid',
          }))
        : [makeEmptyPage(mode)];

      const pageId = (mode === 'geometry' ? data?.currentGeometryPageId : data?.currentAlgebraPageId)
        || validPages[0].id;
      const restoredPage = validPages.find((page) => page.id === pageId) || validPages[0];

      setAlgebraPages(mode === 'algebra' ? validPages : []);
      setGeometryPages(mode === 'geometry' ? validPages : []);
      setCurrentAlgebraPageId(mode === 'algebra' ? restoredPage.id : '');
      setCurrentGeometryPageId(mode === 'geometry' ? restoredPage.id : '');
      setSubjectMode(mode);
      setPan(restoredPage.pan || { x: 200, y: 150 });
      setZoom(restoredPage.zoom || 1);
      setUndoStack([]);
      setRedoStack([]);
      setActiveBoard({ id: board.id, subject: board.subject || 'math', title: board.title || 'Новая доска' });
      setSelectedSubjectId(board.subject || 'math');
      setSubjects((existing) => existing.some((subject) => subject.id === board.subject)
        ? existing
        : [...existing, { id: board.subject || 'math', label: board.subject || 'Математика' }]);
      dirtyRef.current = false;
      setSaveStatus('saved');
      setBoardUrl(board.id);
      setActiveView('board');
      console.log('[activateBoard] Switched activeView to board successfully! Current activeBoard ID:', board.id);
    } catch (err) {
      console.error('[activateBoard] Error activating board, applying empty board fallback:', err);
      const fallbackMode: SubjectMode = board.subject === 'geometry' ? 'geometry' : 'algebra';
      const emptyPage = makeEmptyPage(fallbackMode);
      setAlgebraPages(fallbackMode === 'algebra' ? [emptyPage] : []);
      setGeometryPages(fallbackMode === 'geometry' ? [emptyPage] : []);
      setCurrentAlgebraPageId(fallbackMode === 'algebra' ? emptyPage.id : '');
      setCurrentGeometryPageId(fallbackMode === 'geometry' ? emptyPage.id : '');
      setSubjectMode(fallbackMode);
      setPan(emptyPage.pan);
      setZoom(1);
      setUndoStack([]);
      setRedoStack([]);
      setActiveBoard({ id: board.id, subject: board.subject || 'math', title: board.title || 'Новая доска' });
      dirtyRef.current = false;
      setSaveStatus('saved');
      setBoardUrl(board.id);
      setActiveView('board');
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
    if (!currentUser) {
      setAllUserBoards([]);
      return;
    }
    let isActive = true;
    authFetch('/api/boards', {}, handleLogout)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SavedBoardSummary[]) => {
        if (isActive && Array.isArray(data)) setAllUserBoards(data);
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, [currentUser, boards, handleLogout]);

  useEffect(() => {
    const boardId = initialBoardId.current;
    if (!boardId || !currentUser) {
      if (!boardId) setIsInitialBoardLoading(false);
      return;
    }
    let isActive = true;
    console.log('Opening board ID:', boardId);
    authFetch(`/api/boards/${encodeURIComponent(boardId)}`, {}, handleLogout)
      .then((response) => {
        if (!response.ok) throw new Error(response.status === 404 ? 'Доска не найдена' : `Ошибка загрузки: ${response.status}`);
        return response.json();
      })
      .then((board: SavedBoardRecord) => {
        console.log('Board fetched:', board.data || board);
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

      try {
        // 1. Draw Infinite Squared Grid (or pure white)
        if (currentPage.background) {
          drawBoardBackground(ctx, viewport, currentPage.background, baseCellSize, currentPage.backgroundImage);
        } else {
          drawInfiniteGrid(ctx, viewport, theme, baseCellSize);
        }

        // 2. Draw Math Function Plots (Algebra)
        if (Array.isArray(currentPage?.graphs)) {
          currentPage.graphs.forEach((graph) => {
            if (graph) drawGraphPlot(ctx, graph, viewport);
          });
        }

        // 3. Draw Completed Strokes
        if (Array.isArray(currentPage?.strokes)) {
          currentPage.strokes.forEach((stroke) => {
            if (stroke && Array.isArray(stroke.points)) {
              drawStroke(ctx, stroke, viewport);
            }
          });
        }

        // 4. Draw Current Live Stroke
        if (currentStroke && Array.isArray(currentStroke.points)) {
          drawStroke(ctx, currentStroke, viewport);
        }

        // 5. Draw Laser Trail
        if (Array.isArray(laserPoints) && laserPoints.length > 0) {
          drawLaserTrail(ctx, laserPoints, viewport);
        }
      } catch (renderError) {
        console.error('[Canvas render error]:', renderError);
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
    currentPage.background,
    currentPage.backgroundImage,
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

  // Erase strokes intersecting target point (object erasing for shapes or stroke segments)
  const eraseAtPoint = (worldPt: Point) => {
    const eraseRadius = Math.max(20, 28 / zoom);

    updateCurrentPage((page) => {
      if (eraserMode === 'object') {
        const survivingStrokes = page.strokes.filter(
          (stroke) => !isPointNearStroke(stroke, worldPt, eraseRadius + stroke.width / 2)
        );

        const survivingMath = page.mathElements.filter((el) =>
          Math.hypot(el.x - worldPt.x, el.y - worldPt.y) >= eraseRadius * 4
        );

        if (
          survivingStrokes.length === page.strokes.length &&
          survivingMath.length === page.mathElements.length
        ) {
          return {};
        }

        return {
          strokes: survivingStrokes,
          mathElements: survivingMath,
        };
      }

      // Stroke / segment erase mode
      let changed = false;
      const newStrokes: Stroke[] = [];
      const allShapeTools = [
        'line', 'dashed-line', 'arrow', 'double-arrow', 'rect', 'square', 'circle', 'ellipse',
        'triangle', 'right-triangle', 'axes', 'trapezoid', 'right-trapezoid', 'parallelogram',
        'rhombus', 'box3d', 'cube3d', 'cylinder3d', 'cone3d', 'pyramid3d',
      ];

      for (const stroke of page.strokes) {
        if (allShapeTools.includes(stroke.tool)) {
          if (isPointNearStroke(stroke, worldPt, eraseRadius + stroke.width / 2)) {
            changed = true;
          } else {
            newStrokes.push(stroke);
          }
        } else {
          // Freehand pen or highlighter: remove individual points near eraser
          const hasHit = stroke.points.some(
            (p) => Math.hypot(p.x - worldPt.x, p.y - worldPt.y) <= eraseRadius
          );
          if (hasHit) {
            changed = true;
            const remainingPts = stroke.points.filter(
              (p) => Math.hypot(p.x - worldPt.x, p.y - worldPt.y) > eraseRadius
            );
            if (remainingPts.length >= 2) {
              newStrokes.push({ ...stroke, points: remainingPts });
            }
          } else {
            newStrokes.push(stroke);
          }
        }
      }

      const survivingMath = page.mathElements.filter((el) =>
        Math.hypot(el.x - worldPt.x, el.y - worldPt.y) >= eraseRadius * 4
      );

      if (!changed && survivingMath.length === page.mathElements.length) {
        return {};
      }

      return {
        strokes: newStrokes,
        mathElements: survivingMath,
      };
    });
  };

  // Pointer Event Handlers (Real-time stabilization & smoothing + stylus pressure)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isPen = e.pointerType === 'pen';
    const isTouch = e.pointerType === 'touch';

    if (isPen) {
      lastPenTimeRef.current = Date.now();
    }

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

    const isFingerWithPalmRejection = isTouch && (palmRejection || Date.now() - lastPenTimeRef.current < 1500);
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

    const proShapes = [
      'trapezoid',
      'right-trapezoid',
      'parallelogram',
      'rhombus',
      'box3d',
      'cube3d',
      'cylinder3d',
      'cone3d',
      'pyramid3d',
    ];
    if (proShapes.includes(currentTool) && !currentUser?.is_pro) {
      setIsSubscriptionModalOpen(true);
      return;
    }

    const isShape = [
      'line',
      'dashed-line',
      'arrow',
      'double-arrow',
      'rect',
      'square',
      'circle',
      'ellipse',
      'triangle',
      'right-triangle',
      'axes',
      ...proShapes,
    ].includes(currentTool);
    const worldPt = screenToWorld(e.clientX, e.clientY, isShape);
    const rawPressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    const ptWithPressure = { ...worldPt, pressure: rawPressure, timestamp: Date.now() };

    if (currentTool === 'laser') {
      setLaserPoints((prev) => [
        ...prev,
        { x: worldPt.x, y: worldPt.y, time: Date.now() },
      ]);
      return;
    }

    if (currentTool === 'eraser') {
      isErasingRef.current = true;
      pushUndoState();
      eraseAtPoint(worldPt);
      return;
    }

    // Dynamic width for stylus pressure sensitivity: strokeWidth * (0.25 + 0.75 * pressure)
    const dynamicWidth = isPen
      ? strokeWidth * (0.25 + 0.75 * (rawPressure || 0.5))
      : currentTool === 'highlighter' ? 18 : strokeWidth;

    pushUndoState();
    setCurrentStroke({
      id: `stroke-${Date.now()}`,
      tool: currentTool,
      color: currentTool === 'highlighter' ? '#facc15' : color,
      width: dynamicWidth,
      opacity: currentTool === 'highlighter' ? 0.35 : 1,
      points: [ptWithPressure],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') {
      lastPenTimeRef.current = Date.now();
    }

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

    const isShape = currentStroke && [
      'line', 'dashed-line', 'arrow', 'double-arrow', 'rect', 'square', 'circle', 'ellipse',
      'triangle', 'right-triangle', 'axes', 'trapezoid', 'right-trapezoid', 'parallelogram',
      'rhombus', 'box3d', 'cube3d', 'cylinder3d', 'cone3d', 'pyramid3d',
    ].includes(currentStroke.tool);
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
    if (currentTool === 'eraser' && (isErasingRef.current || e.buttons === 1)) {
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
    isErasingRef.current = false;

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
    // Center world coordinates strictly at the center of the current screen:
    // x = (-pan.x + window.innerWidth / 2) / zoom = (window.innerWidth / 2) / zoom - pan.x
    // y = (-pan.y + window.innerHeight / 2) / zoom = (window.innerHeight / 2) / zoom - pan.y
    const centerWorldX = (window.innerWidth / 2) / zoom - pan.x;
    const centerWorldY = (window.innerHeight / 2) / zoom - pan.y;
    const newElement: MathElement = {
      id: `math-${Date.now()}`,
      x: Math.round(centerWorldX - 75),
      y: Math.round(centerWorldY - 35),
      latex,
      cleanText: latex,
      fontSize: 32,
      color: theme === 'chalkboard' || theme === 'blueprint' ? '#ffffff' : '#1e3a8a',
      fontStyle: 'latex',
    };

    updateCurrentPage(() => ({
      mathElements: [...currentPage.mathElements, newElement],
    }));
  };

  const handleMathDragStart = (event: React.PointerEvent, elementId: string) => {
    if ((event.target as HTMLElement).closest('button, input, textarea')) return;
    event.preventDefault();
    event.stopPropagation();
    const element = currentPage.mathElements.find((item) => item.id === elementId);
    if (!element) return;
    pushUndoState();
    const startX = event.clientX;
    const startY = event.clientY;
    const startElementX = element.x;
    const startElementY = element.y;
    const handleMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      markDirty();
      setPages((existing) => existing.map((page) => page.id === currentPageId
        ? { ...page, mathElements: page.mathElements.map((item) => item.id === elementId
          ? { ...item, x: startElementX + dx, y: startElementY + dy }
          : item) }
        : page));
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const handleUpdateMathElement = (updatedElement: MathElement) => {
    updateCurrentPage(() => ({
      mathElements: currentPage.mathElements.map((element) => element.id === updatedElement.id ? updatedElement : element),
    }));
  };

  const handleDeleteMathElement = (elementId: string) => {
    pushUndoState();
    updateCurrentPage(() => ({
      mathElements: currentPage.mathElements.filter((element) => element.id !== elementId),
    }));
  };

  // Insert Function Graph
  const handleInsertGraph = (formula: string, graphColor: string) => {
    pushUndoState();
    const centerWorldX = (window.innerWidth / 2) / zoom - pan.x;
    const centerWorldY = (window.innerHeight / 2) / zoom - pan.y;
    const newGraph: GraphPlot = {
      id: `graph-${Date.now()}`,
      x: Math.round(centerWorldX),
      y: Math.round(centerWorldY),
      formula,
      color: graphColor,
      rangeX: [-6, 6],
      cellSize: baseCellSize,
    };

    updateCurrentPage(() => ({
      graphs: [...currentPage.graphs, newGraph],
    }));
  };

  const handleToggleTheme = () => {
    setGlobalTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleImportPdfClick = () => {
    if (!currentUser?.is_pro) {
      setIsSubscriptionModalOpen(true);
      setBoardMessage('Импорт презентаций и PDF доступен на тарифе DOSKA PRO');
      return;
    }
    pdfInputRef.current?.click();
  };

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      setIsImportingPdf(true);
      setPdfImportProgress({ currentPage: 0, totalPages: 0 });
      const importedPages = await convertPdfToPages(file, (progress) => {
        setPdfImportProgress(progress);
      });

      if (!importedPages.length) {
        setBoardMessage('Не удалось извлечь страницы из PDF файла');
        return;
      }

      setAlgebraPages((prev) => [...prev, ...importedPages]);
      setCurrentAlgebraPageId(importedPages[0].id);
      setSubjectMode('algebra');
      setPan(importedPages[0].pan);
      setZoom(importedPages[0].zoom);
      markDirty();
      setBoardMessage(`Успешно импортировано страниц: ${importedPages.length}`);
    } catch (err) {
      console.error('PDF import failed:', err);
      setBoardMessage(err instanceof Error ? err.message : 'Ошибка импорта PDF');
    } finally {
      setIsImportingPdf(false);
    }
  };

  const handleQuickStart = (background: BoardBackground, subjectId = 'math') => {
    setIsGuest(true);
    const mode: SubjectMode = subjectId === 'geometry' ? 'geometry' : 'algebra';
    const subjectLabel = labelForSubject(subjectId);
    const newPage = makeEmptyPage(mode, background);
    newPage.pan = {
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
      y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540,
    };
    newPage.zoom = 1;
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
    setActiveBoard({ id: 'guest-' + generateId(), subject: subjectId, title: createAutoTitle(subjectLabel) });
    dirtyRef.current = true;
    setSaveStatus('unsaved');
    setBoardUrl(null);
    setActiveView('board');
  };

  const handleSaveBoard = async (): Promise<boolean> => {
    if (!activeBoard || !currentPage) return false;

    // Guest user trying to save
    if (!currentUser) {
      setAuthNotice('Войдите или зарегистрируйтесь, чтобы сохранить нарисованную доску в свой аккаунт');
      setIsAuthModalOpen(true);
      return false;
    }

    setSaveStatus('saving');
    const isGuestBoard = !activeBoard.id || activeBoard.id.startsWith('guest-');
    const id: string = isGuestBoard || !activeBoard.id ? generateId() : activeBoard.id;
    const persistedPages = pages.map((page) => (page.id === currentPageId ? { ...page, pan, zoom } : page));
    const data: SavedBoardData = {
      subjectMode,
      algebraPages: subjectMode === 'algebra' ? persistedPages : [],
      geometryPages: subjectMode === 'geometry' ? persistedPages : [],
      currentAlgebraPageId: subjectMode === 'algebra' ? currentPageId : undefined,
      currentGeometryPageId: subjectMode === 'geometry' ? currentPageId : undefined,
    };

    try {
      const response = await authFetch(
        '/api/boards',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, subject: activeBoard.subject, title: activeBoard.title, data }),
        },
        handleLogout
      );

      if (response.status === 401) {
        setSaveStatus('unsaved');
        setAuthNotice('Сессия истекла. Войдите снова, чтобы сохранить ваши изменения на доске');
        setIsAuthModalOpen(true);
        return false;
      }

      if (!response.ok) throw new Error(`Ошибка сохранения: ${response.status}`);
      const saved = (await response.json()) as { title: string };
      setActiveBoard((current) => (current ? { ...current, id, title: saved.title } : current));
      setIsGuest(false);
      setBoardUrl(id);
      dirtyRef.current = false;
      setSaveStatus('saved');
      setBoardMessage('Доска успешно сохранена в ваш аккаунт!');
      setAllUserBoards((prev) => {
        const exists = prev.some((b) => b.id === id);
        if (exists) return prev.map((b) => (b.id === id ? { ...b, title: saved.title } : b));
        return [
          {
            id,
            subject: activeBoard.subject,
            title: saved.title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ];
      });
      return true;
    } catch (error) {
      setSaveStatus('error');
      setBoardMessage(error instanceof Error ? error.message : 'Не удалось сохранить доску');
      return false;
    }
  };
  saveBoardRef.current = handleSaveBoard;

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setAuthNotice('');
    if (activeView === 'board' && activeBoard) {
      setBoardMessage('Вы вошли в аккаунт! Сохраняем вашу доску...');
      setTimeout(() => {
        void saveBoardRef.current();
      }, 100);
    }
  };

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
      console.log('Opening board ID:', id);
      const response = await authFetch(`/api/boards/${encodeURIComponent(id)}`, {}, handleLogout);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[handleLoadBoard] Server error response:', response.status, errText);
        throw new Error(response.status === 404 ? 'Доска не найдена' : `Ошибка загрузки (${response.status})`);
      }
      const boardData = (await response.json()) as SavedBoardRecord;
      console.log('Board fetched:', boardData.data || boardData);
      activateBoard(boardData);
    } catch (error) {
      console.error('[handleLoadBoard] Exception loading board:', error);
      setBoardMessage(error instanceof Error ? error.message : 'Не удалось загрузить доску');
      setActiveView('dashboard');
    }
  }, [handleLogout]);

  const handleRequestOpenBoard = (id: string) => {
    console.log('Opening board ID:', id);
    void handleLoadBoard(id);
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

  const proceedWithCreateBoard = (
    subjectId = selectedSubjectId,
    background: BoardBackground = 'grid',
    customTitle?: string
  ) => {
    setIsGuest(false);
    const mode: SubjectMode = subjectId === 'geometry' ? 'geometry' : 'algebra';
    const subjectLabel = labelForSubject(subjectId);
    const newPage = makeEmptyPage(mode, background);
    newPage.pan = {
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
      y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540,
    };
    newPage.zoom = 1;
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
    setSubjects((existing) =>
      existing.some((subject) => subject.id === subjectId)
        ? existing
        : [
            ...existing,
            {
              id: subjectId,
              label:
                subjectLabel !== subjectId
                  ? subjectLabel
                  : subjectId === 'math'
                  ? 'Математика / Алгебра'
                  : subjectId === 'russian'
                  ? 'Русский язык / Литература'
                  : subjectId === 'physics'
                  ? 'Физика'
                  : subjectId === 'geography'
                  ? 'География / История'
                  : subjectId === 'general'
                  ? 'Общая'
                  : subjectId,
            },
          ]
    );
    const title = customTitle?.trim() || createAutoTitle(subjectLabel);
    setActiveBoard({ id: null, subject: subjectId, title });
    dirtyRef.current = true;
    setSaveStatus('unsaved');
    setBoardUrl(null);
    setActiveView('board');
  };

  const handleCreateBoard = (
    subjectId = selectedSubjectId,
    background: BoardBackground = 'grid',
    customTitle?: string
  ) => {
    if (currentUser && !currentUser.is_pro && allUserBoards.length >= 1) {
      setIsCreateBoardOpen(false);
      setPendingCreateAction(() => () => proceedWithCreateBoard(subjectId, background, customTitle));
      setIsBoardLimitModalOpen(true);
      return;
    }
    proceedWithCreateBoard(subjectId, background, customTitle);
  };

  const handleConfirmReplaceBoard = async () => {
    setIsBoardLimitModalOpen(false);
    if (allUserBoards.length > 0) {
      const boardToDelete = allUserBoards[0];
      try {
        await authFetch(`/api/boards/${encodeURIComponent(boardToDelete.id)}`, { method: 'DELETE' }, handleLogout);
        setBoards((prev) => prev.filter((b) => b.id !== boardToDelete.id));
        setAllUserBoards((prev) => prev.filter((b) => b.id !== boardToDelete.id));
      } catch (err) {
        console.error('Failed to delete existing board for replacement:', err);
      }
    }
    if (pendingCreateAction) {
      pendingCreateAction();
      setPendingCreateAction(null);
    } else {
      setIsCreateBoardOpen(true);
    }
  };

  const handleReturnToDashboard = async () => {
    if (isGuest || !currentUser) {
      if (dirtyRef.current) {
        const confirmLeave = window.confirm(
          'У вас есть несохраненные рисунки. Выйти в главное меню без сохранения в аккаунт?'
        );
        if (!confirmLeave) return;
      }
      setIsGuest(false);
    } else if (activeBoard && (dirtyRef.current || !activeBoard.id)) {
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
    setAllUserBoards((existing) => existing.filter((board) => board.id !== id));
  };

  const handleAddSubject = (label: string) => {
    const subject = { id: `custom-${generateId()}`, label };
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

  const handleExport = (format: ExportFormat) => {
    if ((format === 'png-ultra' || format === 'pdf' || format === 'svg') && !currentUser?.is_pro) {
      setIsSubscriptionModalOpen(true);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const baseName = `doska_${activeBoard?.title || 'board'}`.replace(/[^\p{L}\p{N}_-]+/gu, '_');

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setBoardMessage('Разрешите всплывающие окна для экспорта PDF.');
        return;
      }
      const pageImages = pages.map((page) => {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = 1600;
        pageCanvas.height = 900;
        const context = pageCanvas.getContext('2d');
        if (!context) return '';
        const pageViewport: Viewport = { pan: page.pan, zoom: page.zoom, width: 1600, height: 900 };
        drawBoardBackground(context, pageViewport, page.background || 'grid', baseCellSize, page.backgroundImage);
        page.graphs.forEach((graph) => drawGraphPlot(context, graph, pageViewport));
        page.strokes.forEach((stroke) => drawStroke(context, stroke, pageViewport));
        page.mathElements.forEach((element) => {
          context.fillStyle = element.color;
          context.font = `${element.fontSize * page.zoom}px sans-serif`;
          context.fillText(element.cleanText || element.latex || '', (element.x + page.pan.x) * page.zoom, (element.y + page.pan.y) * page.zoom);
        });
        return `<section><h2>${page.title.replace(/[&<>"']/g, '')}</h2><img src="${pageCanvas.toDataURL('image/png')}" /></section>`;
      }).join('');
      printWindow.document.write(`<!doctype html><html><head><title>${(activeBoard?.title || 'Урок').replace(/[&<>"']/g, '')}</title><style>@page{size:landscape;margin:10mm}body{font:14px sans-serif;color:#111}section{break-after:page}section:last-child{break-after:auto}img{width:100%;height:auto}h2{margin:0 0 8px}</style></head><body>${pageImages}</body></html>`);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
      return;
    }

    const composedCanvas = document.createElement('canvas');
    composedCanvas.width = canvas.width;
    composedCanvas.height = canvas.height;
    const composedContext = composedCanvas.getContext('2d');
    if (!composedContext) return;
    composedContext.drawImage(canvas, 0, 0);
    const deviceScale = canvas.width / Math.max(1, canvas.clientWidth);
    currentPage.mathElements.forEach((element) => {
      composedContext.fillStyle = element.color;
      composedContext.font = `${element.fontSize * zoom * deviceScale}px sans-serif`;
      composedContext.textBaseline = 'top';
      composedContext.fillText(
        element.cleanText || element.latex || element.text || '',
        (element.x + pan.x) * zoom * deviceScale,
        (element.y + pan.y) * zoom * deviceScale
      );
    });

    if (format === 'jpeg-low' || format === 'jpeg-medium') {
      link.download = `${baseName}.jpg`;
      link.href = composedCanvas.toDataURL('image/jpeg', format === 'jpeg-low' ? 0.55 : 0.82);
    } else if (format === 'png-ultra') {
      const scale = Math.max(2, Math.ceil(3840 / canvas.clientWidth));
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width * scale;
      exportCanvas.height = canvas.height * scale;
      const context = exportCanvas.getContext('2d');
      if (!context) return;
      context.drawImage(composedCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
      link.download = `${baseName}_ultrahd.png`;
      link.href = exportCanvas.toDataURL('image/png');
    } else {
      const image = composedCanvas.toDataURL('image/png');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${image}" width="100%" height="100%"/></svg>`;
      link.download = `${baseName}.svg`;
      link.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    }
    link.click();
    if (format === 'svg') URL.revokeObjectURL(link.href);
  };

  const handleShareBoard = async () => {
    if (!activeBoard) return;
    if (!activeBoard.id || dirtyRef.current) {
      const saved = await saveBoardRef.current();
      if (!saved) return;
    }
    const boardId = activeBoard.id || '';
    const shareUrl = `https://doska-edu.ru/board/${boardId}`;
    const shareText = `Приглашаю на интерактивную доску DOSKA!\nСсылка на урок: ${shareUrl}\n\nСервис для удобных онлайн-занятий и репетиторов: https://doska-edu.ru`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Интерактивная доска DOSKA',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setBoardMessage('Ссылка и рекомендация сервиса скопированы!');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(shareText);
        setBoardMessage('Ссылка и рекомендация сервиса скопированы!');
      } catch {
        setBoardMessage('Не удалось скопировать приглашение.');
      }
    }
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
          onQuickStart={handleQuickStart}
          onOpenAuth={() => {
            setAuthNotice('');
            setIsAuthModalOpen(true);
          }}
          onCreateBoard={() => {
            if (currentUser && !currentUser.is_pro && allUserBoards.length >= 1) {
              setPendingCreateAction(() => () => setIsCreateBoardOpen(true));
              setIsBoardLimitModalOpen(true);
              return;
            }
            setIsCreateBoardOpen(true);
          }}
          onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
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

      {activeView === 'board' && (
        <CanvasErrorBoundary onReturnToDashboard={() => setActiveView('dashboard')}>
          {activeBoard && (
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
              onExport={handleExport}
              onShare={handleShareBoard}
              isPro={Boolean(currentUser?.is_pro)}
              onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
              onToggleFullscreen={handleToggleFullscreen}
              isGuest={isGuest || !currentUser}
              onImportPdf={handleImportPdfClick}
              onToggleTheme={handleToggleTheme}
            />
          )}

          {/* 2. Floating Bottom Slides Dock Bar */}
          <SlidesBar
            pages={pages}
            currentPageId={currentPageId}
            theme={theme}
            onSelectPage={(id) => {
              setCurrentPageId(id);
              const target = pages.find((p) => p.id === id);
              if (target?.pan) setPan(target.pan);
              if (target?.zoom) setZoom(target.zoom);
            }}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
          />

      {/* 3. Main Drawing Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
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

      {currentPage.mathElements.map((element) => (
        <MathCard
          key={element.id}
          element={element}
          zoom={zoom}
          pan={pan}
          theme={theme}
          onUpdate={handleUpdateMathElement}
          onDelete={handleDeleteMathElement}
          onDragStart={handleMathDragStart}
        />
      ))}

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
        eraserMode={eraserMode}
        onToggleEraserMode={() => setEraserMode((prev) => (prev === 'object' ? 'stroke' : 'object'))}
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
              currentUser={currentUser}
              onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
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
        boardBackground={currentPage.background || 'grid'}
        onChangeBoardBackground={(background) => updateCurrentPage(() => ({ background }))}
        currentUser={currentUser}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
        onResetToolbarPos={() =>
          setToolbarPos({
            x: Math.max(20, window.innerWidth / 2 - 240),
            y: Math.max(40, window.innerHeight - (isBottomBannerVisible ? 140 : 80)),
          })
        }
      />
        </CanvasErrorBoundary>
      )}

      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onCreateBoard={handleCreateBoard}
        currentUser={currentUser}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
      />
      {currentUser && (
        <ProfileModal
          isOpen={isAccountSettingsOpen}
          onClose={() => setIsAccountSettingsOpen(false)}
          currentUser={currentUser}
          authToken={getStoredToken() || ''}
          onUserUpdated={setCurrentUser}
          onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
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

      {/* 7. Ads and Subscription Modals */}
      {activeView === 'dashboard' && !currentUser?.is_pro && (
        <AdBanner
          isPro={Boolean(currentUser?.is_pro)}
          onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
          onVisibilityChange={setIsBottomBannerVisible}
        />
      )}

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

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfFileChange}
      />

      {isImportingPdf && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-white max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center gap-4 text-center">
            <LoaderCircle className="w-10 h-10 animate-spin text-sky-400" />
            <div>
              <h3 className="text-lg font-bold">Импорт PDF документа</h3>
              <p className="text-sm text-slate-300 mt-1">
                {pdfImportProgress.totalPages > 0
                  ? `Конвертация страницы ${pdfImportProgress.currentPage} из ${pdfImportProgress.totalPages}...`
                  : 'Обработка файла...'}
              </p>
            </div>
          </div>
        </div>
      )}

      <BoardLimitModal
        isOpen={isBoardLimitModalOpen}
        onClose={() => setIsBoardLimitModalOpen(false)}
        existingBoardTitle={allUserBoards[0]?.title || 'Моя доска'}
        onConfirmReplace={handleConfirmReplaceBoard}
        onOpenSubscription={() => {
          setIsBoardLimitModalOpen(false);
          setIsSubscriptionModalOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthNotice('');
        }}
        notice={authNotice}
        onSuccess={handleAuthSuccess}
        onOpenTerms={() => setIsTermsModalOpen(true)}
        onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
        onOpenContacts={() => setIsContactsModalOpen(true)}
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
