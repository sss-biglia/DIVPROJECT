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
    throw new Error('Agregá tu API key de Groq en config.ts antes de usar las funciones de IA.');
  }
};

const callGroq = async (model: string, messages: object[]): Promise<string> => {
  ensureConfigured();

  const response = await fetch(CONFIG.GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.GROQ_API_KEY}`,
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
    throw new Error(`Error de Groq ${response.status}: ${errorMessage}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Groq devolvió una respuesta vacía.');
  }

  return text;
};

export const analyzeReceipt = async (
  base64Image: string
): Promise<ExtractedExpense> => {
  const text = await callGroq(CONFIG.VISION_MODEL, [
    {
      role: 'system',
      content:
        'You are an expense extraction specialist for Argentina. Amounts use dot as thousands separator: $1.400 means 1400 pesos. Currency is ARS by default. Extract the final TOTAL only. Respond ONLY in raw JSON.',
    },
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
      role: 'system',
      content:
        'You are an expense parser for Argentina. You MUST respond with ONLY a JSON object, nothing else. No markdown, no backticks, no explanation. Just the raw JSON.',
    },
    {
      role: 'user',
      content: `Extract the expense from this text. The amount is always a number.
'luca' or 'lucas' = 1000 pesos each. 'palo' = 1000000 pesos.
'mango' = 1 peso. Numbers written as '1.400' mean 1400 (dot is thousands separator).
Text: ${text}
Respond ONLY with: {"amount": number, "currency": "ARS", "description": string, "category": string}
Category must be one of: food, transport, accommodation, drinks, supermarket, entertainment, health, other.`,
    },
  ]);

  const clean = stripJsonNoise(result);
  let parsed: ExtractedExpense;

  try {
    parsed = JSON.parse(clean) as ExtractedExpense;
  } catch (error) {
    throw new Error('No pudimos interpretar el texto. Probá escribirlo diferente.');
  }

  return {
    ...parsed,
    currency: normalizeExpenseCurrency(parsed.currency),
    category: normalizeExpenseCategory(parsed.category),
  };
};
