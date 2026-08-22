const https = require('https');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Generate a React component named PreviewComponent for a CMS widget.
Use Material-UI v4 components and icons as bare identifiers (no imports). Use makeStyles for styling.
No imports, no exports, no window/document/fetch/eval access.
Keep code under 80 lines. Use JSX. Be concise — inline data, minimal styles.

Respond with ONLY valid JSON:
{"name":"Widget Name","key":"PascalKey","description":"One line","icon":"mui_icon","type":"widget","props":[],"dependencies":{},"code":"const PreviewComponent = () => { ... };"}`;

const callGemini = async (apiKey, prompt, themeConfig) => {
  const themeNote = themeConfig ? `\nTheme: ${JSON.stringify(themeConfig)}` : '';
  const userPrompt = `${prompt}\nKeep code under 80 lines, be concise.${themeNote}`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${GEMINI_API_URL}?key=${apiKey}`);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
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
    req.write(body);
    req.end();
  });
};

const generateWidget = async (prompt, themeConfig) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'GEMINI_API_KEY is not configured');
  }

  let data;
  try {
    data = await callGemini(process.env.GEMINI_API_KEY, prompt, themeConfig);
  } catch (error) {
    if (error.message === 'TIMEOUT') {
      throw new ApiError(httpStatus.GATEWAY_TIMEOUT, 'AI generation timed out. Try a simpler widget.');
    }
    throw new ApiError(httpStatus.BAD_GATEWAY, `AI generation failed: ${error.message}`);
  }

  const candidate = data?.candidates?.[0];
  if (!candidate?.content?.parts?.[0]?.text) {
    const reason = candidate?.finishReason || 'unknown';
    throw new ApiError(httpStatus.BAD_GATEWAY, `AI generation failed (${reason}). Try a different prompt.`);
  }

  let text = candidate.content.parts[0].text.trim();
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) text = jsonMatch[0];

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(httpStatus.BAD_GATEWAY, `AI response was not valid JSON: ${text.substring(0, 200)}`);
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
