const https = require('https');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Generate a React component named PreviewComponent for a CMS widget.
Use Material-UI v4 components and icons as bare identifiers (no imports). Use makeStyles for styling.
No imports, no exports, no window/document/fetch/eval access.
Keep code VERY short — under 60 lines. Use JSX. Inline all data.

Return ONLY a JSON object with these fields: name, key, description, icon, type, props, dependencies, code.
The "code" field must contain the full component as a string.`;

const callGemini = (apiKey, body) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${GEMINI_API_URL}?key=${apiKey}`);
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 400) {
            try {
              reject(new Error(JSON.parse(raw).error?.message || `HTTP ${res.statusCode}`));
            } catch {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error('Invalid API response'));
          }
        });
      }
    );
    req.setTimeout(55000, () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

const generateWidget = async (prompt, themeConfig) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'GEMINI_API_KEY is not configured');
  }

  const themeNote = themeConfig ? `\nTheme palette: ${JSON.stringify(themeConfig).substring(0, 500)}` : '';
  const userPrompt = `Create a simple widget: ${prompt}\nKeep code under 60 lines.${themeNote}`;

  let data;
  try {
    data = await callGemini(process.env.GEMINI_API_KEY, {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    });
  } catch (error) {
    if (error.message === 'TIMEOUT') {
      throw new ApiError(httpStatus.GATEWAY_TIMEOUT, 'AI generation timed out. Try a simpler widget.');
    }
    throw new ApiError(httpStatus.BAD_GATEWAY, `AI generation failed: ${error.message}`);
  }

  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason || 'unknown';

  let text = '';
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) text += part.text;
    }
  }

  if (!text.trim()) {
    throw new ApiError(httpStatus.BAD_GATEWAY, `AI generation failed (${finishReason}). Try a different prompt.`);
  }

  text = text.trim();
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) text = jsonMatch[0];

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      `AI response was not valid JSON (finishReason: ${finishReason}, length: ${text.length}): ${text.substring(0, 300)}`
    );
  }

  return {
    code: parsed.code,
    dependencies: parsed.dependencies,
    name: parsed.name,
    description: parsed.description,
    key: parsed.key,
    icon: parsed.icon,
    type: parsed.type,
    props: parsed.props,
  };
};

module.exports = {
  generateWidget,
};
