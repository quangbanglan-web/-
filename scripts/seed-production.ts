import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '..', 'data.db');
console.log('Seeding production database at:', dbPath);

const db = new Database(dbPath);

// Ensure tables exist
db.exec(`
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

  CREATE TABLE IF NOT EXISTS ad_impressions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    ad_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

console.log('Clearing existing data...');
db.prepare('DELETE FROM boards').run();
db.prepare('DELETE FROM subscriptions').run();
db.prepare('DELETE FROM payments').run();
db.prepare('DELETE FROM ad_impressions').run();
db.prepare('DELETE FROM users').run();

// 1. Create Admin
// email: admin@doska-edu.ru
// password: DoskaAdmin2026!
// is_pro: 1, pro_expires_at: 253402300799000 (year 9999 permanent)
const adminId = 'admin-user-id';
const adminHash = bcrypt.hashSync('DoskaAdmin2026!', 10);
// pro_expires_at timestamp or ISO: 253402300799000 = 9999-12-31T23:59:59.000Z
const farFuturePro = '9999-12-31T23:59:59.000Z';

db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role, is_pro, pro_expires_at, created_at)
  VALUES (?, ?, ?, ?, 'admin', 1, ?, CURRENT_TIMESTAMP)
`).run(adminId, 'admin@doska-edu.ru', adminHash, 'Иван (Администратор)', farFuturePro);

console.log('Admin created: admin@doska-edu.ru / DoskaAdmin2026!');

// 2. Create 5 Demo Accounts
// password: Teacher2026!
// demo1, demo2: PRO
// demo3, demo4, demo5: FREE
const teacherHash = bcrypt.hashSync('Teacher2026!', 10);
const proDate30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

const demoAccounts = [
  { id: 'demo-user-1', email: 'demo1@doska-edu.ru', name: 'Мария (Алгебра)', is_pro: 1, pro_expires_at: proDate30Days },
  { id: 'demo-user-2', email: 'demo2@doska-edu.ru', name: 'Алексей (Геометрия)', is_pro: 1, pro_expires_at: proDate30Days },
  { id: 'demo-user-3', email: 'demo3@doska-edu.ru', name: 'Елена (Физика)', is_pro: 0, pro_expires_at: null },
  { id: 'demo-user-4', email: 'demo4@doska-edu.ru', name: 'Дмитрий (Русский язык)', is_pro: 0, pro_expires_at: null },
  { id: 'demo-user-5', email: 'demo5@doska-edu.ru', name: 'Ольга (История)', is_pro: 0, pro_expires_at: null },
];

const insertUserStmt = db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role, is_pro, pro_expires_at, created_at)
  VALUES (?, ?, ?, ?, 'user', ?, ?, CURRENT_TIMESTAMP)
`);

for (const demo of demoAccounts) {
  insertUserStmt.run(demo.id, demo.email, teacherHash, demo.name, demo.is_pro, demo.pro_expires_at);
  console.log(`Demo user created: ${demo.email} (${demo.is_pro ? 'PRO' : 'FREE'})`);
}

// 3. Create 1 sample math board for demo1
const sampleBoardId = 'sample-math-board-demo1';
const sampleBoardData = {
  subjectMode: 'algebra',
  algebraPages: [
    {
      id: 'demo-slide-1',
      title: 'Слайд 1: Квадратные уравнения',
      strokes: [
        {
          id: 'stroke-header-line',
          tool: 'line',
          points: [{ x: -300, y: -220 }, { x: 300, y: -220 }],
          color: '#3b82f6',
          width: 3,
          opacity: 1
        }
      ],
      mathElements: [
        {
          id: 'math-elem-1',
          x: -250,
          y: -280,
          latex: 'ax^2 + bx + c = 0',
          cleanText: 'ax^2 + bx + c = 0',
          fontSize: 32,
          color: '#1e3a8a',
          fontStyle: 'latex'
        },
        {
          id: 'math-elem-2',
          x: -250,
          y: -140,
          latex: 'D = b^2 - 4ac',
          cleanText: 'D = b^2 - 4ac',
          fontSize: 28,
          color: '#047857',
          fontStyle: 'latex'
        },
        {
          id: 'math-elem-3',
          x: -250,
          y: -40,
          latex: 'x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}',
          cleanText: 'x_{1,2} = (-b +- sqrt(D)) / (2a)',
          fontSize: 28,
          color: '#b91c1c',
          fontStyle: 'latex'
        }
      ],
      graphs: [],
      pan: { x: 960, y: 540 },
      zoom: 1
    },
    {
      id: 'demo-slide-2',
      title: 'Слайд 2: Теорема Виета',
      strokes: [],
      mathElements: [
        {
          id: 'math-elem-4',
          x: -200,
          y: -200,
          latex: '\\begin{cases} x_1 + x_2 = -\\frac{b}{a} \\\\ x_1 \\cdot x_2 = \\frac{c}{a} \\end{cases}',
          cleanText: 'x1+x2=-b/a, x1*x2=c/a',
          fontSize: 28,
          color: '#6366f1',
          fontStyle: 'latex'
        }
      ],
      graphs: [],
      pan: { x: 960, y: 540 },
      zoom: 1
    }
  ],
  geometryPages: [],
  currentAlgebraPageId: 'demo-slide-1'
};

db.prepare(`
  INSERT INTO boards (id, user_id, subject, title, data, created_at, updated_at)
  VALUES (?, ?, 'math', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run(
  sampleBoardId,
  'demo-user-1',
  'Математика — Вводный урок (Квадратные уравнения)',
  JSON.stringify(sampleBoardData)
);

console.log('Sample board created for demo1:', sampleBoardId);
console.log('Seed completed successfully!');
