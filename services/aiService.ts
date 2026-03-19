import { CONFIG } from '../config';
import { ExtractedExpense } from '../types';
import { normalizeExpenseCategory, normalizeExpenseCurrency } from '../utils/expense';

const stripJsonNoise = (value: string) =>
  value
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/^[\s`]+|[\s`]+$/g, '')
    .trim();

const ensureConfigured = () => {
  if (!CONFIG.GROQ_API_KEY || CONFIG.GROQ_API_KEY === 'TU_KEY_DE_GROQ_ACA') {
    throw new Error('Add your Groq API key in config.ts before using AI features.');
  }
};

const callGroq = async (model: string, messages: object[]): Promise<string> => {
  ensureConfigured();

  const response = await fetch(CONFIG.GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.error?.message || 'Unknown error';
    console.error('Groq error details:', JSON.stringify(errorBody));
    throw new Error(`Groq error ${response.status}: ${errorMessage}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Groq returned an empty response.');
  }

  return text;
};

export const analyzeReceipt = async (
  base64Image: string
): Promise<ExtractedExpense> => {
  const text = await callGroq(CONFIG.VISION_MODEL, [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
          },
        },
        {
          type: 'text',
          text: 'Analyze this receipt or expense image. Extract: total amount, currency (ARS or USD only), store or merchant name, date if visible, list of items if readable, and expense category. Category must be one of: food, transport, accommodation, drinks, supermarket, entertainment, health, other. Respond ONLY in raw JSON, no markdown, no backticks: {"total": number, "currency": "ARS" or "USD", "merchant": string, "date": string, "category": string, "items": [{"name": string, "price": number}]}',
        },
      ],
    },
  ]);

  const clean = stripJsonNoise(text);
  const parsed = JSON.parse(clean) as ExtractedExpense;

  return {
    ...parsed,
    currency: normalizeExpenseCurrency(parsed.currency),
    category: normalizeExpenseCategory(parsed.category),
  };
};

export const parseExpenseText = async (
  text: string
): Promise<ExtractedExpense> => {
  const result = await callGroq(CONFIG.TEXT_MODEL, [
    {
      role: 'user',
      content: `Extract expense info from this text. Detect if amounts are in ARS (pesos) or USD (dollars). Category must be one of: food, transport, accommodation, drinks, supermarket, entertainment, health, other. Respond ONLY in raw JSON, no markdown: {"amount": number, "currency": "ARS" or "USD", "description": string, "category": string}. Text: "${text}"`,
    },
  ]);

  const clean = stripJsonNoise(result);
  const parsed = JSON.parse(clean) as ExtractedExpense;

  return {
    ...parsed,
    currency: normalizeExpenseCurrency(parsed.currency),
    category: normalizeExpenseCategory(parsed.category),
  };
};
