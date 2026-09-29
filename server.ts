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
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';
const BASE_URL = (process.env.BASE_URL || process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const APP_URL = BASE_URL;

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

  CREATE TABLE IF NOT EXISTS ad_impressions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    ad_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    payment_method_id TEXT,
    status TEXT DEFAULT 'active',
    next_billing_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 99,
    status TEXT NOT NULL,
    is_recurrent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
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
    VALUES (?, ?, ?, ?, 'admin', 1, NULL)
  `).run(defaultTeacherId, 'teacher@doska.ru', hash, 'Преподаватель');
}

// Ensure teacher@doska.ru or first registered user has 'admin' role
database.prepare(`
  UPDATE users SET role = 'admin'
  WHERE email = 'teacher@doska.ru'
     OR id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
`).run();

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

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен: требуются права администратора' });
  }
  next();
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

// POST /api/auth/upgrade-pro — Активация PRO подписки
app.post('/api/auth/upgrade-pro', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    database.prepare('UPDATE users SET is_pro = 1, pro_expires_at = ? WHERE id = ?')
      .run(expiresAt, userId);

    const user = database.prepare(`
      SELECT id, email, name, role, is_pro, pro_expires_at, created_at
      FROM users WHERE id = ?
    `).get(userId) as any;

    return res.json({
      ok: true,
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
    console.error('Error upgrading to PRO:', error);
    return res.status(500).json({ error: 'Ошибка активации подписки' });
  }
});

// ----------------- Ads API -----------------

// POST /api/ads/impression — Логирование показов рекламы
app.post('/api/ads/impression', (req: Request, res: Response) => {
  try {
    const { ad_type } = req.body ?? {};
    if (typeof ad_type !== 'string' || !ad_type.trim()) {
      return res.status(400).json({ error: 'Поле ad_type обязательно' });
    }

    // Извлечение user_id из заголовка Authorization, если авторизован
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
        userId = decoded.id;
      } catch {
        // Невалидный или истекший токен - логируем с userId = null
      }
    }

    const impressionId = randomUUID();
    database.prepare(`
      INSERT INTO ad_impressions (id, user_id, ad_type, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(impressionId, userId, ad_type.trim());

    return res.status(201).json({ ok: true, id: impressionId });
  } catch (error: any) {
    console.error('Error logging ad impression:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при сохранении показа рекламы' });
  }
});

// ----------------- Payments & Subscriptions (YooKassa) -----------------

// POST /api/payments/create & POST /api/payments/create-subscription — Инициализация платежа 99 ₽/мес
const handleCreatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const idempotenceKey = randomUUID();

    // Если заданы рабочие ключи ЮKassa в .env: отправляем запрос к официальному API
    if (YOOKASSA_SHOP_ID && YOOKASSA_SECRET_KEY && YOOKASSA_SHOP_ID !== 'test_shop_id') {
      try {
        const basicAuth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');
        const yooResponse = await fetch('https://api.yookassa.ru/v3/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotence-Key': idempotenceKey,
            'Authorization': `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            amount: { value: '99.00', currency: 'RUB' },
            capture: true,
            save_payment_method: true,
            description: 'Подписка DOSKA PRO на 1 месяц',
            metadata: { user_id: userId },
            confirmation: {
              type: 'redirect',
              return_url: `${BASE_URL}/?payment=success`,
            },
          }),
        });

        const yooData = (await yooResponse.json()) as any;
        if (yooResponse.ok && yooData?.confirmation?.confirmation_url) {
          database.prepare(`
            INSERT INTO payments (id, user_id, amount, status, is_recurrent)
            VALUES (?, ?, 99, 'pending', 0)
            ON CONFLICT(id) DO UPDATE SET status = 'pending'
          `).run(yooData.id, userId);

          return res.json({
            confirmation_url: yooData.confirmation.confirmation_url,
            payment_id: yooData.id,
          });
        }
        console.warn('[YooKassa Warning] Live API returned non-ok status:', yooData);
      } catch (yooErr) {
        console.warn('[YooKassa Error] Request failed, activating sandbox fallback:', yooErr);
      }
    } else {
      console.warn('[YooKassa Dev] YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY not set. Using sandbox mock payment URL.');
    }

    // Режим разработки / Sandbox эмуляция при локальном запуске
    const mockPaymentId = 'pay_' + randomUUID();
    database.prepare(`
      INSERT INTO payments (id, user_id, amount, status, is_recurrent)
      VALUES (?, ?, 99, 'pending', 0)
    `).run(mockPaymentId, userId);

    const mockUrl = `${BASE_URL}/?mock_payment_id=${mockPaymentId}`;
    return res.json({
      confirmation_url: mockUrl,
      payment_id: mockPaymentId,
      is_sandbox: true,
    });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return res.status(500).json({ error: 'Ошибка создания платежа в платежной системе' });
  }
};

app.post('/api/payments/create', authMiddleware, handleCreatePayment);
app.post('/api/payments/create-subscription', authMiddleware, handleCreatePayment);

// POST /api/payments/webhook — Вебхук от ЮKassa (или симулятора оплаты)
app.post('/api/payments/webhook', (req: Request, res: Response) => {
  try {
    const event = req.body?.event;
    const paymentObj = req.body?.object;

    if (event === 'payment.succeeded' && paymentObj) {
      const paymentId = paymentObj.id || randomUUID();
      const userId = paymentObj.metadata?.user_id;
      const paymentMethodId = paymentObj.payment_method?.id || ('pm_' + randomUUID());
      const isSaved = paymentObj.payment_method?.saved !== false;

      if (userId) {
        database.prepare(`
          INSERT INTO payments (id, user_id, amount, status, is_recurrent)
          VALUES (?, ?, 99, 'succeeded', 0)
          ON CONFLICT(id) DO UPDATE SET status = 'succeeded'
        `).run(paymentId, userId);

        // Обновляем пользователя: is_pro = 1, pro_expires_at = +30 дней
        database.prepare(`
          UPDATE users 
          SET is_pro = 1, pro_expires_at = datetime('now', '+30 days')
          WHERE id = ?
        `).run(userId);

        // Сохраняем подписку
        const subId = 'sub_' + randomUUID();
        database.prepare(`
          INSERT INTO subscriptions (id, user_id, payment_method_id, status, next_billing_date)
          VALUES (?, ?, ?, 'active', datetime('now', '+30 days'))
        `).run(subId, userId, isSaved ? paymentMethodId : null);
      }
    }

    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Ошибка обработки вебхука' });
  }
});

// POST /api/subscriptions/cancel — Отмена автопродления пользователем
app.post('/api/subscriptions/cancel', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = database.prepare("UPDATE subscriptions SET status = 'canceled' WHERE user_id = ? AND status = 'active'").run(userId);
    return res.json({ ok: true, canceledCount: result.changes });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return res.status(500).json({ error: 'Ошибка отмены подписки' });
  }
});

// GET /api/subscriptions/my — Текущая подписка пользователя
app.get('/api/subscriptions/my', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sub = database.prepare(`
      SELECT id, status, next_billing_date, payment_method_id, created_at
      FROM subscriptions
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `).get(userId) as any;

    return res.json({ subscription: sub || null });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ error: 'Ошибка получения подписки' });
  }
});

// Фоновая задача рекуррентного списания
const processRecurringSubscriptions = async () => {
  try {
    const dueSubscriptions = database.prepare(`
      SELECT s.id as sub_id, s.user_id, s.payment_method_id, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
        AND s.payment_method_id IS NOT NULL
        AND s.next_billing_date <= datetime('now')
    `).all() as Array<{ sub_id: string; user_id: string; payment_method_id: string; email: string }>;

    for (const sub of dueSubscriptions) {
      const recurrentPaymentId = 'rec_' + randomUUID();
      let succeeded = true;

      if (YOOKASSA_SHOP_ID && YOOKASSA_SECRET_KEY && YOOKASSA_SHOP_ID !== 'test_shop_id') {
        try {
          const basicAuth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');
          const resp = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotence-Key': randomUUID(),
              'Authorization': `Basic ${basicAuth}`,
            },
            body: JSON.stringify({
              amount: { value: '99.00', currency: 'RUB' },
              capture: true,
              payment_method_id: sub.payment_method_id,
              description: 'Автопродление DOSKA PRO — 99 ₽/мес',
              metadata: { user_id: sub.user_id, is_recurrent: '1' },
            }),
          });
          const data = (await resp.json()) as any;
          succeeded = resp.ok && (data.status === 'succeeded' || data.status === 'waiting_for_capture');
        } catch {
          succeeded = false;
        }
      }

      if (succeeded) {
        database.prepare(`
          INSERT INTO payments (id, user_id, amount, status, is_recurrent)
          VALUES (?, ?, 99, 'succeeded', 1)
        `).run(recurrentPaymentId, sub.user_id);

        database.prepare(`
          UPDATE users
          SET is_pro = 1, pro_expires_at = datetime('now', '+30 days')
          WHERE id = ?
        `).run(sub.user_id);

        database.prepare(`
          UPDATE subscriptions
          SET next_billing_date = datetime('now', '+30 days'), status = 'active'
          WHERE id = ?
        `).run(sub.sub_id);
      } else {
        database.prepare("UPDATE subscriptions SET status = 'past_due' WHERE id = ?").run(sub.sub_id);
      }
    }
  } catch (err) {
    console.error('Error processing recurring payments:', err);
  }
};

app.post('/api/payments/process-recurring', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  await processRecurringSubscriptions();
  return res.json({ ok: true });
});

// Рекуррентная проверка каждые 6 часов
setInterval(processRecurringSubscriptions, 6 * 60 * 60 * 1000);

// ----------------- Admin API (Protected) -----------------

// GET /api/admin/stats — Общая сводка для владельца
app.get('/api/admin/stats', authMiddleware, adminMiddleware, (_req: AuthRequest, res: Response) => {
  try {
    const totalUsers = (database.prepare('SELECT count(*) as count FROM users').get() as any).count;
    const proUsers = (database.prepare('SELECT count(*) as count FROM users WHERE is_pro = 1').get() as any).count;
    const totalBoards = (database.prepare('SELECT count(*) as count FROM boards').get() as any).count;
    const totalAdImpressions = (database.prepare('SELECT count(*) as count FROM ad_impressions').get() as any).count;
    const bannerImpressions = (database.prepare("SELECT count(*) as count FROM ad_impressions WHERE ad_type = 'banner_bottom'").get() as any).count;
    const interstitialImpressions = (database.prepare("SELECT count(*) as count FROM ad_impressions WHERE ad_type = 'interstitial_board_open'").get() as any).count;
    const totalRevenue = (database.prepare("SELECT coalesce(sum(amount), 0) as total FROM payments WHERE status = 'succeeded'").get() as any).total;
    const activeSubscriptions = (database.prepare("SELECT count(*) as count FROM subscriptions WHERE status = 'active'").get() as any).count;

    return res.json({
      totalUsers,
      proUsers,
      totalBoards,
      totalRevenue,
      activeSubscriptions,
      ads: {
        total: totalAdImpressions,
        bannerBottom: bannerImpressions,
        interstitial: interstitialImpressions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// GET /api/admin/users — Список пользователей для админки
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const filter = search ? `%${search}%` : '';

    const users = database.prepare(`
      SELECT 
        u.id, u.email, u.name, u.role, u.is_pro, u.pro_expires_at, u.created_at,
        (SELECT count(*) FROM boards b WHERE b.user_id = u.id) as boards_count,
        (SELECT count(*) FROM ad_impressions a WHERE a.user_id = u.id) as ad_impressions_count,
        (SELECT s.status FROM subscriptions s WHERE s.user_id = u.id ORDER BY s.created_at DESC LIMIT 1) as subscription_status
      FROM users u
      WHERE (? = '' OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)
      ORDER BY u.created_at DESC
    `).all(filter, filter, filter);

    return res.json({ users });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ error: 'Ошибка получения списка пользователей' });
  }
});

// POST /api/admin/users/:id/grant-pro — Выдача PRO блогерам/учителям
app.post('/api/admin/users/:id/grant-pro', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { duration = '1_month' } = req.body ?? {};

    let proExpiresAt: string;
    if (duration === '1_year') {
      proExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    } else if (duration === 'forever') {
      proExpiresAt = '2099-12-31T23:59:59.000Z';
    } else {
      proExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const result = database.prepare('UPDATE users SET is_pro = 1, pro_expires_at = ? WHERE id = ?')
      .run(proExpiresAt, targetUserId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const updatedUser = database.prepare('SELECT id, email, name, role, is_pro, pro_expires_at FROM users WHERE id = ?').get(targetUserId);
    return res.json({ ok: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error granting PRO:', error);
    return res.status(500).json({ error: 'Ошибка выдачи PRO статуса' });
  }
});

// POST /api/admin/users/:id/revoke-pro — Снятие PRO статуса
app.post('/api/admin/users/:id/revoke-pro', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const result = database.prepare('UPDATE users SET is_pro = 0, pro_expires_at = NULL WHERE id = ?')
      .run(targetUserId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    database.prepare("UPDATE subscriptions SET status = 'canceled' WHERE user_id = ?").run(targetUserId);
    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Error revoking PRO:', error);
    return res.status(500).json({ error: 'Ошибка отзыва PRO статуса' });
  }
});

// ----------------- Boards API (Protected) -----------------

app.get('/api/boards', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user?.role === 'admin';
    const subject = typeof req.query.subject === 'string' ? req.query.subject.trim() : '';

    const query = isAdmin
      ? (subject
          ? 'SELECT id, subject, title, updated_at, created_at FROM boards WHERE subject = ? ORDER BY updated_at DESC'
          : 'SELECT id, subject, title, updated_at, created_at FROM boards ORDER BY updated_at DESC')
      : (subject
          ? 'SELECT id, subject, title, updated_at, created_at FROM boards WHERE (user_id = ? OR user_id IS NULL OR user_id = \'default-teacher-uuid\') AND subject = ? ORDER BY updated_at DESC'
          : 'SELECT id, subject, title, updated_at, created_at FROM boards WHERE (user_id = ? OR user_id IS NULL OR user_id = \'default-teacher-uuid\') ORDER BY updated_at DESC');

    const boards = isAdmin
      ? (subject ? database.prepare(query).all(subject) : database.prepare(query).all())
      : (subject ? database.prepare(query).all(userId, subject) : database.prepare(query).all(userId));

    return res.json(boards);
  } catch (error) {
    console.error('Error in GET /api/boards:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при получении списка досок' });
  }
});

app.get('/api/boards/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin
      ? 'SELECT id, subject, title, data, created_at, updated_at FROM boards WHERE id = ?'
      : 'SELECT id, subject, title, data, created_at, updated_at FROM boards WHERE id = ? AND (user_id = ? OR user_id IS NULL OR user_id = \'default-teacher-uuid\')';
    const board = (isAdmin
      ? database.prepare(query).get(req.params.id)
      : database.prepare(query).get(req.params.id, userId)) as
      | { id: string; subject: string; title: string; data: string; created_at: string; updated_at: string }
      | undefined;

    if (!board) return res.status(404).json({ error: 'Доска не найдена' });

    let parsedData: any = {};
    try {
      parsedData = typeof board.data === 'string' ? JSON.parse(board.data) : (board.data || {});
    } catch (err) {
      console.error('Failed to parse board data JSON:', err);
      parsedData = {};
    }
    return res.status(200).json({ ...board, data: parsedData });
  } catch (error) {
    console.error('Error in GET /api/boards/:id:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при загрузке доски' });
  }
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

// Setup Vite middleware in dev or static files in production (NetAngels / VPS)
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';
  const distPath = path.join(__dirname, 'dist');

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite dev middleware error, using static dist fallback:', err);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req: Request, res: Response) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  } else {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('[Warning] dist/ directory not found! Please run "npm run build" before running in production.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
