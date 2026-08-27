const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TEXT_MODEL = 'gemini-3.5-flash';
const FALLBACK_TEXT_MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash'];
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

function getGeminiTextConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL).trim();
  return { apiKey, model };
}

function isGeminiTextConfigured() {
  return Boolean(getGeminiTextConfig().apiKey);
}

function extractGeminiText(responseBody) {
  const parts = responseBody?.candidates?.[0]?.content?.parts || [];
  const answerParts = parts.filter((part) => part && part.thought !== true && part.text);
  const source = answerParts.length ? answerParts : parts.filter((part) => part?.text);
  return source
    .map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}

function resolveModelCandidates(preferred) {
  const primary = String(preferred || DEFAULT_TEXT_MODEL).trim();
  const extras = String(process.env.GEMINI_TEXT_FALLBACK_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const defaults = extras.length ? extras : FALLBACK_TEXT_MODELS;
  return [...new Set([primary, ...defaults])];
}

function isModelUnavailableError(err) {
  const msg = String(err?.message || '');
  return (
    err?.code === 'GEMINI_MODEL_UNAVAILABLE' ||
    /no longer available|not found|NOT_FOUND|is not found/i.test(msg)
  );
}

function resolveThinkingLevel() {
  const raw = String(process.env.GEMINI_THINKING_LEVEL || 'MINIMAL')
    .trim()
    .toUpperCase();
  if (['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'].includes(raw)) return raw;
  return 'MINIMAL';
}

async function generateGeminiTextOnce(opts) {
  const { apiKey, model, systemPrompt, userPrompt, maxTokens, temperature, jsonMode } = opts;
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  const generationConfig = {
    maxOutputTokens: maxTokens,
    thinkingConfig: { thinkingLevel: resolveThinkingLevel() },
    ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
  };
  if (opts.temperatureSet) {
    generationConfig.temperature = temperature;
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig,
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rawMessage = data?.error?.message || data?.error?.status || `Gemini text API failed (${res.status})`;
    const err = new Error(rawMessage);
    err.status = res.status;
    if (res.status === 404 || /no longer available|NOT_FOUND|is not found/i.test(String(rawMessage))) {
      err.code = 'GEMINI_MODEL_UNAVAILABLE';
    } else {
      err.code = 'GEMINI_TEXT_ERROR';
    }
    throw err;
  }

  const text = extractGeminiText(data);
  if (!text) {
    const err = new Error('Gemini returned empty text');
    err.code = 'GEMINI_EMPTY';
    throw err;
  }
  return text;
}

async function generateGeminiText(opts = {}) {
  const { apiKey, model } = getGeminiTextConfig();
  if (!apiKey) {
    const err = new Error('Gemini is not configured. Add GEMINI_API_KEY.');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  const systemPrompt = String(opts.systemPrompt || '').trim();
  const userPrompt = String(opts.userPrompt || '').trim();
  if (!userPrompt) {
    const err = new Error('userPrompt is required');
    err.code = 'INVALID_PROMPT';
    throw err;
  }

  const maxTokens = Math.min(Math.max(Number(opts.maxTokens) || DEFAULT_MAX_OUTPUT_TOKENS, 1024), 65536);
  const temperatureSet = opts.temperature != null;
  const temperature = temperatureSet ? Number(opts.temperature) : 0.7;
  const jsonMode = opts.jsonMode === true;
  const models = resolveModelCandidates(model);
  let lastErr;

  for (let i = 0; i < models.length; i += 1) {
    const candidate = models[i];
    try {
      return await generateGeminiTextOnce({
        apiKey,
        model: candidate,
        systemPrompt,
        userPrompt,
        maxTokens,
        temperature,
        temperatureSet,
        jsonMode,
      });
    } catch (err) {
      lastErr = err;
      if (i < models.length - 1 && isModelUnavailableError(err)) {
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('Gemini text failed');
}

function appendSseText(fullText, chunk) {
  const lines = String(chunk || '').split('\n');
  let next = fullText;
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const json = line.slice(6).trim();
    if (!json || json === '[DONE]') continue;
    try {
      const data = JSON.parse(json);
      for (const part of data?.candidates?.[0]?.content?.parts || []) {
        if (part.thought === true || !part.text) continue;
        next += part.text;
      }
    } catch (e) {
      // ignore malformed SSE lines
    }
  }
  return next;
}

async function streamGeminiText(opts) {
  const { systemPrompt, userPrompt, maxTokens, temperature, onText } = opts || {};
  const { apiKey, model } = getGeminiTextConfig();
  if (!apiKey) {
    const err = new Error('Gemini is not configured. Add GEMINI_API_KEY.');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const generationConfig = {
    maxOutputTokens: maxTokens || DEFAULT_MAX_OUTPUT_TOKENS,
    thinkingConfig: { thinkingLevel: resolveThinkingLevel() },
  };
  if (typeof temperature === 'number') {
    generationConfig.temperature = temperature;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gemini API error (${response.status})`);
  }

  let fullText = '';
  const emit = (chunk) => {
    const next = appendSseText(fullText, chunk);
    if (next === fullText) return;
    fullText = next;
    if (onText) onText(fullText);
  };

  if (response.body.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const parts = sseBuffer.split('\n\n');
      sseBuffer = parts.pop();
      for (const part of parts) emit(part);
    }
    if (sseBuffer.trim()) emit(sseBuffer);
  } else {
    const decoder = new TextDecoder();
    let sseBuffer = '';
    for await (const chunk of response.body) {
      sseBuffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
      const parts = sseBuffer.split('\n\n');
      sseBuffer = parts.pop();
      for (const part of parts) emit(part);
    }
    if (sseBuffer.trim()) emit(sseBuffer);
  }

  return fullText;
}

module.exports = {
  DEFAULT_TEXT_MODEL,
  isGeminiTextConfigured,
  generateGeminiText,
  streamGeminiText,
  extractGeminiText,
  getGeminiTextConfig,
};
