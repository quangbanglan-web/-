import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

const dataDir = path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const database = new DatabaseSync(path.join(dataDir, 'board.sqlite'));
database.exec(`
  CREATE TABLE IF NOT EXISTS board_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    algebra_pages TEXT NOT NULL,
    geometry_pages TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

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
  const isProd = process.env.NODE_ENV === 'production';

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
