import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { GoogleGenAI, Type } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'doska-super-secret-jwt-commercial-key-2026';

app.use(express.json({ limit: '25mb' }));
app.use(cors());

const database = new Database(path.resolve(__dirname, 'data.db'));
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_pro INTEGER DEFAULT 0,
    pro_expires_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    subject TEXT NOT NULL DEFAULT 'math',
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS board_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    algebra_pages TEXT NOT NULL,
    geometry_pages TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_migrations (
    id TEXT PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migration for boards table columns
const boardColumns = database.pragma('table_info(boards)') as Array<{ name: string }>;
if (!boardColumns.some((column) => column.name === 'subject')) {
  database.exec("ALTER TABLE boards ADD COLUMN subject TEXT NOT NULL DEFAULT 'math'");
}
if (!boardColumns.some((column) => column.name === 'user_id')) {
  database.exec("ALTER TABLE boards ADD COLUMN user_id TEXT REFERENCES users(id)");
}

// Seed default teacher if no users exist to preserve existing standalone boards
const existingUsersCount = (database.prepare('SELECT count(*) as count FROM users').get() as { count: number }).count;
const defaultTeacherId = 'default-teacher-uuid';

if (existingUsersCount === 0) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('teacher123', salt);
  database.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, is_pro, pro_expires_at)
    VALUES (?, ?, ?, ?, 'user', 1, NULL)
  `).run(defaultTeacherId, 'teacher@doska.ru', hash, 'Преподаватель');
}

// Ensure all existing unassigned boards belong to a valid user
const fallbackUser = database.prepare('SELECT id FROM users ORDER BY created_at ASC LIMIT 1').get() as { id: string } | undefined;
if (fallbackUser) {
  database.prepare('UPDATE boards SET user_id = ? WHERE user_id IS NULL').run(fallbackUser.id);
}

const legacyBoards = database.prepare("SELECT id, data FROM boards WHERE subject = 'math'").all() as Array<{
  id: string;
  data: string;
}>;
const migrateLegacyGeometryBoard = database.prepare("UPDATE boards SET subject = 'geometry' WHERE id = ?");
for (const board of legacyBoards) {
  try {
    if (JSON.parse(board.data)?.subjectMode === 'geometry') migrateLegacyGeometryBoard.run(board.id);
  } catch {
    // Leave malformed legacy data assigned to the default math subject.
  }
}

const makeAutoTitle = (subject: string) => {
  const subjectLabels: Record<string, string> = {
    math: 'Математика',
    physics: 'Физика',
    informatics: 'Информатика',
    geography: 'География',
    history: 'История',
    geometry: 'Геометрия',
  };
  const timestamp = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date()).replace(',', '');
  return `${subjectLabels[subject] || subject} — Урок от ${timestamp}`;
};

const migrateLegacyPages = database.transaction(() => {
  const migrationId = 'legacy-pages-to-subject-boards-v1';
  if (database.prepare('SELECT 1 FROM app_migrations WHERE id = ?').get(migrationId)) return;

  const legacyState = database.prepare('SELECT algebra_pages, geometry_pages FROM board_state WHERE id = 1').get() as
    | { algebra_pages: string; geometry_pages: string }
    | undefined;
  if (legacyState) {
    const ownerId = fallbackUser?.id || defaultTeacherId;
    const insertLegacyBoard = database.prepare(`
      INSERT OR IGNORE INTO boards (id, user_id, subject, title, data)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      const algebraPages = JSON.parse(legacyState.algebra_pages) as Array<{ id: string; title?: string }>;
      if (Array.isArray(algebraPages) && algebraPages.length) {
        insertLegacyBoard.run(
          'legacy-math-pages-v1',
          ownerId,
          'math',
          `Математика — ${algebraPages[0].title || 'Старые страницы'}`,
          JSON.stringify({ subjectMode: 'algebra', algebraPages, geometryPages: [], currentAlgebraPageId: algebraPages[0].id })
        );
      }
    } catch {
      // Leave malformed legacy pages in board_state for manual recovery.
    }

    try {
      const geometryPages = JSON.parse(legacyState.geometry_pages) as Array<{ id: string; title?: string }>;
      if (Array.isArray(geometryPages) && geometryPages.length) {
        insertLegacyBoard.run(
          'legacy-geometry-pages-v1',
          ownerId,
          'geometry',
          `Геометрия — ${geometryPages[0].title || 'Старые страницы'}`,
          JSON.stringify({ subjectMode: 'geometry', algebraPages: [], geometryPages, currentGeometryPageId: geometryPages[0].id })
        );
      }
    } catch {
      // Leave malformed legacy pages in board_state for manual recovery.
    }
  }

  database.prepare('INSERT INTO app_migrations (id) VALUES (?)').run(migrationId);
});
migrateLegacyPages();

// Auth request interface & middleware
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const token = authHeader.substring(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный или истекший токен авторизации' });
  }
};

// ----------------- Auth API -----------------

// POST /api/auth/register — Регистрация
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Пожалуйста, укажите ваше имя' });
    }
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Пожалуйста, укажите email' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Некорректный формат адреса email' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать не менее 6 символов' });
    }

    const cleanName = name.trim();

    // Проверка на существующего пользователя
    const existing = database.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    database.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, is_pro, pro_expires_at, created_at)
      VALUES (?, ?, ?, ?, 'user', 0, NULL, CURRENT_TIMESTAMP)
    `).run(userId, cleanEmail, passwordHash, cleanName);

    // Если это первый зарегистрированный человек (кроме демо teacher@doska.ru), привяжем существующие демо-доски к нему
    const nonDefaultCount = (database.prepare("SELECT count(*) as count FROM users WHERE email != 'teacher@doska.ru'").get() as { count: number }).count;
    if (nonDefaultCount === 1) {
      database.prepare("UPDATE boards SET user_id = ? WHERE user_id = 'default-teacher-uuid'").run(userId);
    }

    const token = jwt.sign(
      { id: userId, email: cleanEmail, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: userId,
        email: cleanEmail,
        name: cleanName,
        role: 'user',
        is_pro: false,
        pro_expires_at: null,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/register:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при регистрации' });
  }
});

// POST /api/auth/login — Вход
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
      return res.status(400).json({ error: 'Введите email и пароль' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = database.prepare(`
      SELECT id, email, password_hash, name, role, is_pro, pro_expires_at, created_at
      FROM users WHERE LOWER(email) = LOWER(?)
    `).get(cleanEmail) as {
      id: string;
      email: string;
      password_hash: string;
      name: string;
      role: string;
      is_pro: number;
      pro_expires_at: string | null;
      created_at: string;
    } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Неверный адрес электронной почты или пароль' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный адрес электронной почты или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_pro: Boolean(user.is_pro),
        pro_expires_at: user.pro_expires_at,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/login:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при авторизации' });
  }
});

// GET /api/auth/me — Текущий профиль
app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = database.prepare(`
      SELECT id, email, name, role, is_pro, pro_expires_at, created_at
      FROM users WHERE id = ?
    `).get(req.user!.id) as {
      id: string;
      email: string;
      name: string;
      role: string;
      is_pro: number;
      pro_expires_at: string | null;
      created_at: string;
    } | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_pro: Boolean(user.is_pro),
        pro_expires_at: user.pro_expires_at,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// ----------------- Boards API (Protected) -----------------

app.get('/api/boards', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const subject = typeof req.query.subject === 'string' ? req.query.subject.trim() : '';
  const boards = subject
    ? database.prepare('SELECT id, subject, title, updated_at, created_at FROM boards WHERE user_id = ? AND subject = ? ORDER BY updated_at DESC').all(userId, subject)
    : database.prepare('SELECT id, subject, title, updated_at, created_at FROM boards WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
  return res.json(boards);
});

app.get('/api/boards/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const board = database.prepare('SELECT id, subject, title, data, created_at, updated_at FROM boards WHERE id = ? AND user_id = ?').get(req.params.id, userId) as
    | { id: string; subject: string; title: string; data: string; created_at: string; updated_at: string }
    | undefined;

  if (!board) return res.status(404).json({ error: 'Доска не найдена' });
  return res.json({ ...board, data: JSON.parse(board.data) });
});

app.post('/api/boards', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id = randomUUID(), subject, title, data } = req.body ?? {};
  if (typeof id !== 'string' || !id.trim() || typeof subject !== 'string' || !subject.trim() || data === undefined) {
    return res.status(400).json({ error: 'Поля id, subject и data обязательны' });
  }

  // Проверка прав на существующую доску
  const existing = database.prepare('SELECT user_id FROM boards WHERE id = ?').get(id.trim()) as { user_id: string } | undefined;
  if (existing && existing.user_id !== userId) {
    return res.status(403).json({ error: 'У вас нет прав на редактирование этой доски' });
  }

  let serializedData: string;
  try {
    serializedData = JSON.stringify(data);
  } catch {
    return res.status(400).json({ error: 'Поле data должно быть корректным JSON' });
  }

  const boardTitle = typeof title === 'string' && title.trim() ? title.trim() : makeAutoTitle(subject.trim());

  database.prepare(`
    INSERT INTO boards (id, user_id, subject, title, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      subject = excluded.subject,
      title = excluded.title,
      data = excluded.data,
      updated_at = CURRENT_TIMESTAMP
    WHERE boards.user_id = excluded.user_id
  `).run(id.trim(), userId, subject.trim(), boardTitle, serializedData);

  return res.json({ id: id.trim(), subject: subject.trim(), title: boardTitle });
});

app.patch('/api/boards/:id/rename', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'Название не может быть пустым' });

  const result = database.prepare('UPDATE boards SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
    .run(title, req.params.id, userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Доска не найдена или доступ ограничен' });
  return res.json({ id: req.params.id, title });
});

app.delete('/api/boards/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const result = database.prepare('DELETE FROM boards WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Доска не найдена или доступ ограничен' });
  return res.json({ ok: true });
});

const isPageArray = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every(
    (page) =>
      page !== null &&
      typeof page === 'object' &&
      typeof page.id === 'string' &&
      typeof page.title === 'string' &&
      Array.isArray(page.strokes) &&
      Array.isArray(page.mathElements) &&
      Array.isArray(page.graphs) &&
      page.pan !== null &&
      typeof page.pan === 'object' &&
      typeof page.pan.x === 'number' &&
      typeof page.pan.y === 'number' &&
      typeof page.zoom === 'number'
  );

app.get('/api/board', (_req: Request, res: Response) => {
  const row = database.prepare('SELECT algebra_pages, geometry_pages FROM board_state WHERE id = 1').get() as
    | { algebra_pages: string; geometry_pages: string }
    | undefined;

  if (!row) return res.json({ algebraPages: null, geometryPages: null });

  return res.json({
    algebraPages: JSON.parse(row.algebra_pages),
    geometryPages: JSON.parse(row.geometry_pages),
  });
});

app.put('/api/board', (req: Request, res: Response) => {
  const { algebraPages, geometryPages } = req.body ?? {};
  if (!isPageArray(algebraPages) || !isPageArray(geometryPages)) {
    return res.status(400).json({ error: 'algebraPages and geometryPages must be valid page arrays' });
  }

  database.prepare(`
    INSERT INTO board_state (id, algebra_pages, geometry_pages)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      algebra_pages = excluded.algebra_pages,
      geometry_pages = excluded.geometry_pages,
      updated_at = CURRENT_TIMESTAMP
  `).run(JSON.stringify(algebraPages), JSON.stringify(geometryPages));

  return res.json({ ok: true });
});

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Endpoint: Recognize handwritten math, numbers, fractions, equations from canvas snippet
app.post('/api/recognize-math', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mode = 'formula' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    if (!ai) {
      // Fallback if no key is configured in dev
      return res.json({
        latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        text: 'x = (-b ± √(b² - 4ac)) / (2a)',
        result: '',
        confidence: 'demo',
      });
    }

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const systemPrompt = `You are a specialized mathematical OCR engine for an online math classroom whiteboard.
The user is a teacher or student writing on a school squared notebook or math board with a stylus or finger.
Analyze the handwritten stroke image containing numbers, arithmetic, algebra, fractions, square roots, integrals, matrices, geometry, or Greek symbols.
Convert the handwritten strokes into clean, beautiful, mathematically correct standard LaTeX.

Guidelines:
1. Provide valid LaTeX without surrounding enclosing dollar signs ($ or $$).
2. Clean up handwriting imperfections into neat math formatting (e.g. \\frac{a}{b}, \\sqrt{x}, x^2, \\int, \\sum, \\alpha, \\beta, \\pi, \\pm, \\cdot).
3. If it's a simple number (e.g., "5", "42", "3.14"), return just that number.
4. If it's an equation or equality, keep both sides intact (e.g., "2x + 4 = 10").
5. If it's a system of equations, format using \\begin{cases} ... \\end{cases}.
6. In 'result', if it is a direct calculation (like 25 * 4, or 3/4 + 1/2) or a basic equation with clear root, provide the concise solved value (e.g. "100" or "x = 3"). Otherwise leave result empty.`;

    // Robust recognition with fallback and timeout
    let outputText = '';
    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.8-flash'];

    for (const modelName of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Data,
                },
              },
              {
                text: `Transcribe and recognize this teacher's handwriting snippet. Return json with:
1) "cleanText": the exact Russian or English text / numbers / formula in clean beautiful readable format.
2) "latex": if there are mathematical equations, roots, fractions, numbers or formulas, format them in standard LaTeX (without $). If it's pure Russian text or notes, leave latex empty or as \\text{...}.
3) "result": if arithmetic calculation, give result or empty string.`,
              },
            ],
          },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                cleanText: {
                  type: Type.STRING,
                  description: 'Beautifully transcribed handwritten text, words, and numbers',
                },
                latex: {
                  type: Type.STRING,
                  description: 'Valid clean standard LaTeX string (no $ or $$ wrapper)',
                },
                text: {
                  type: Type.STRING,
                  description: 'Human-readable plain text or speech representation',
                },
                result: {
                  type: Type.STRING,
                  description: 'Calculated result or solution if applicable, or empty string',
                },
                category: {
                  type: Type.STRING,
                  description: 'text, math, formula, number',
                },
              },
              required: ['cleanText'],
            },
          },
        });
        clearTimeout(timeoutId);
        outputText = response.text?.trim() || '';
        if (outputText) break;
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or busy:`, err.message);
      }
    }

    if (!outputText) {
      // Graceful fallback instead of 500 error so UI never hangs infinitely
      return res.json({
        cleanText: 'Формула',
        latex: 'y = f(x)',
        text: 'y = f(x)',
        result: '',
        category: 'text',
      });
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(outputText);
    } catch {
      parsedData = { cleanText: outputText, latex: '', text: outputText };
    }

    // Sanitize latex (strip dollar signs if model accidentally included them)
    let latexClean = parsedData.latex || '';
    if (latexClean) {
      latexClean = latexClean.replace(/^\$+|\$+$/g, '').trim();
    }

    const cleanText = parsedData.cleanText || parsedData.text || latexClean || '';

    return res.json({
      cleanText,
      latex: latexClean,
      text: parsedData.text || cleanText,
      result: parsedData.result || '',
      category: parsedData.category || 'text',
    });
  } catch (error: any) {
    console.error('Error recognizing math:', error);
    // Never fail with 500, return fallback so client doesn't freeze
    return res.json({
      cleanText: 'Рукописная запись',
      latex: '',
      text: 'Рукописная запись',
      result: '',
      category: 'text',
    });
  }
});

// Endpoint: Step-by-step math solver / hints for online tutoring
app.post('/api/solve-math', async (req: Request, res: Response) => {
  try {
    const { latex } = req.body;
    if (!latex) {
      return res.status(400).json({ error: 'latex is required' });
    }

    if (!ai) {
      return res.json({
        steps: ['Шаг 1: Подставим значения', 'Шаг 2: Вычислим результат'],
        answer: 'Ответ: x = 0',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Реши или упрости математическое выражение/уравнение для школьного урока:
LaTeX: ${latex}

Предоставь краткое и ясное решение по шагам на русском языке.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Пошаговые действия для ученика с формулами в LaTeX',
            },
            finalAnswer: {
              type: Type.STRING,
              description: 'Итоговый ответ в LaTeX',
            },
          },
          required: ['steps', 'finalAnswer'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error solving math:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
