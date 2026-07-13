import { z } from "zod";

export const PROMPT_VERSION = "v1";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const insightSchema = z.object({
  tip: z.string().min(1).max(500),
  action: z.string().min(1).max(300),
  focus: z.enum(["protein", "water", "timing", "activity"]),
  risk_level: z.enum(["none", "low", "medium"]),
});

export type Insight = z.infer<typeof insightSchema>;

export const menuSchema = z.object({
  meals: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        time_window: z.string().min(1).max(50),
        items: z.array(z.string().min(1).max(200)).min(1).max(6),
        approx_kcal: z.number().min(0).max(3000),
        approx_protein_g: z.number().min(0).max(300),
      }),
    )
    .min(3)
    .max(5),
  total_kcal: z.number().min(0).max(5000),
  total_protein_g: z.number().min(0).max(400),
  note: z.string().max(300),
});

export type MenuSuggestion = z.infer<typeof menuSchema>;

export type DayContext = {
  displayName: string;
  targetKcal: number;
  targetProteinG: number;
  targetWaterMl: number;
  dayTemplateType: string;
  currentWeightKg: number | null;
  weightAvg7d: number | null;
  recentDays: {
    date: string;
    kcal: number;
    proteinG: number;
    waterMl: number;
  }[];
};

async function callGemini(
  prompt: string,
  options?: { temperature?: number; maxOutputTokens?: number },
): Promise<unknown> {
  return callGeminiParts([{ text: prompt }], options);
}

async function callGeminiParts(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  options?: { temperature?: number; maxOutputTokens?: number },
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 1024,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return JSON.parse(text);
}

const GUARDRAILS = `Правила (обязательно):
- Ты НЕ врач. Не ставь диагнозы, не назначай лекарства и добавки.
- НЕ пересчитывай калории и БЖУ — используй только числа из контекста.
- Тон: поддерживающий, без стыда и давления. Обращайся на "ты".
- Пользователь работает ночными сменами — учитывай его график, не советуй "не есть после 18:00".
- Отвечай ТОЛЬКО валидным JSON без markdown.`;

export async function generateDailyInsight(
  context: DayContext,
): Promise<Insight> {
  const prompt = `Ты — ассистент в персональном трекере похудения. Пользователь: ${context.displayName}, цель 80 кг.

${GUARDRAILS}

Контекст (посчитан кодом приложения, доверяй этим числам):
- Цель на день: ${context.targetKcal} ккал, белок ${context.targetProteinG} г, вода ${context.targetWaterMl} мл
- Тип текущего дня: ${context.dayTemplateType}
- Текущий вес: ${context.currentWeightKg ?? "нет данных"} кг, среднее за 7 дней: ${context.weightAvg7d?.toFixed(1) ?? "нет данных"} кг
- Последние дни: ${JSON.stringify(context.recentDays)}

Дай ОДИН короткий совет на сегодня. JSON-схема:
{"tip": "наблюдение по данным, 1-2 предложения", "action": "одно конкретное действие на сегодня", "focus": "protein|water|timing|activity", "risk_level": "none|low|medium"}

risk_level "medium" — только если видишь системную проблему (несколько дней сильного недобора калорий или белка).`;

  const raw = await callGemini(prompt);
  return insightSchema.parse(raw);
}

export async function generateMenuSuggestion(
  context: DayContext,
): Promise<MenuSuggestion> {
  const prompt = `Ты — ассистент в персональном трекере похудения. Пользователь: ${context.displayName}, работает ночными сменами.

${GUARDRAILS}

Составь меню на следующий день:
- Бюджет: ${context.targetKcal} ккал, белок не меньше ${context.targetProteinG} г
- Тип дня: ${context.dayTemplateType}
- Предпочтения: творог, протеиновые коктейли, простые блюда без сложной готовки, минимум фастфуда
- 3-4 приёма пищи, привязанных к графику (после сна / перед сменой / во время смены / после смены)

JSON-схема:
{"meals": [{"label": "название приёма", "time_window": "когда", "items": ["блюдо ~вес"], "approx_kcal": число, "approx_protein_g": число}], "total_kcal": число, "total_protein_g": число, "note": "короткий комментарий"}`;

  const raw = await callGemini(prompt);
  return menuSchema.parse(raw);
}

export const receiptSchema = z.object({
  store: z.string().max(120).optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        grams: z.number().min(0).max(100000).optional().nullable(),
        price_byn: z.number().min(0).max(100000).optional().nullable(),
      }),
    )
    .min(1)
    .max(80),
});

export type ReceiptParseResult = z.infer<typeof receiptSchema>;

const RECEIPT_PROMPT = `Ты разбираешь белорусский/российский кассовый чек магазина продуктов.
Верни только JSON:
{"store": "название магазина или null", "items": [{"name": "товар", "grams": число_или_null, "price_byn": число_в_BYN}]}

Правила:
- Цены в белорусских рублях (BYN). Если в чеке копейки — переведи в BYN (например 2,49 → 2.49).
- grams: если указан вес (кг/г) — приведи к граммам. 0.3 кг → 300. Если вес неясен — null.
- Пропускай сдачу, итог, НДС, номер чека, карты — только товары.
- name — короткое понятное название на русском.`;

export async function parseReceiptText(text: string): Promise<ReceiptParseResult> {
  const raw = await callGemini(
    `${RECEIPT_PROMPT}\n\nТекст чека:\n${text.slice(0, 8000)}`,
    { temperature: 0.2, maxOutputTokens: 2048 },
  );
  return receiptSchema.parse(raw);
}

export async function parseReceiptImage(params: {
  mimeType: string;
  base64: string;
}): Promise<ReceiptParseResult> {
  const raw = await callGeminiParts(
    [
      { text: RECEIPT_PROMPT },
      {
        inlineData: {
          mimeType: params.mimeType,
          data: params.base64,
        },
      },
    ],
    { temperature: 0.2, maxOutputTokens: 2048 },
  );
  return receiptSchema.parse(raw);
}
