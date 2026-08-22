const https = require('https');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

const SYSTEM_PROMPT = `You are a React widget generator for Sling CMS. Generate a single React component called PreviewComponent.

CRITICAL — KEEP CODE COMPACT:
- Maximum 150 lines of code in the "code" field
- Use inline styles or minimal makeStyles — avoid large style objects
- Use concise variable names and avoid unnecessary wrapper elements
- Hardcode sample data inline — no large mock arrays
- Prioritize visual impact with minimal code

RULES:
1. The component MUST be named PreviewComponent
2. Use Material-UI v4 (from @material-ui/core, @material-ui/icons, @material-ui/lab)
3. Use React hooks as bare identifiers: useState, useEffect, useCallback, useMemo, useRef (NO imports)
4. Use MUI components as bare identifiers: Box, Typography, Button, Grid, Paper, Card, etc. (NO imports)
5. NO import or export statements — code is injected into a sandbox via scope injection
6. NO window, document, fetch, eval, localStorage, XMLHttpRequest, WebSocket, or Worker access
7. The component must be self-contained and render purely from its own state and props
8. Use makeStyles for styling (available as bare identifier)

THEME CONTEXT:
{themeJson}

AVAILABLE BARE IDENTIFIERS:
- @material-ui/core: Box, Typography, Button, Grid, Paper, Card, CardContent, CardMedia, CardActions, IconButton, TextField, Chip, Avatar, List, ListItem, ListItemText, Divider, Tab, Tabs, Switch, Checkbox, FormControlLabel, Select, MenuItem, Tooltip, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Container, Collapse, makeStyles
- @material-ui/icons: Star, Favorite, Home, Settings, Search, Add, Delete, Edit, Close, Menu, Check, Warning, Info, Error, ExpandMore, ExpandLess, Person, ShoppingCart, etc.
- @material-ui/lab: Autocomplete, ToggleButton, ToggleButtonGroup, Skeleton, Alert, Rating, Pagination

OUTPUT — respond with ONLY this JSON object:
{
  "name": "Widget Name",
  "key": "PascalCaseKey",
  "description": "One-line description",
  "icon": "material_icon_ligature",
  "type": "widget",
  "props": [{"name": "propName", "propType": "static", "dataType": "string", "default": "value"}],
  "dependencies": {"@material-ui/core": ["Box"], "@material-ui/icons": ["Star"]},
  "code": "const PreviewComponent = () => { return React.createElement(Box, null, 'Hello'); };"
}`;

const streamGemini = (apiKey, body) => {
  return new Promise((resolve, reject) => {
    const url = `${GEMINI_STREAM_URL}&key=${apiKey}`;
    const payload = JSON.stringify(body);
    const parsed = new URL(url);

    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 400) {
            try {
              const err = JSON.parse(raw);
              reject(new Error(err.error?.message || `HTTP ${res.statusCode}`));
            } catch {
              reject(new Error(`HTTP ${res.statusCode}: ${raw.substring(0, 200)}`));
            }
            return;
          }
          const textParts = [];
          let finishReason = null;
          const lines = raw.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (!json || json === '[DONE]') continue;
            try {
              const event = JSON.parse(json);
              const candidate = event.candidates?.[0];
              if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                  if (part.text) textParts.push(part.text);
                }
              }
              if (candidate?.finishReason) finishReason = candidate.finishReason;
            } catch {
              // skip malformed SSE lines
            }
          }
          resolve({ text: textParts.join(''), finishReason });
        });
      }
    );

    req.setTimeout(55000, () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

const generateWidget = async (prompt, themeConfig) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'GEMINI_API_KEY is not configured');
  }

  const themeJson = themeConfig ? JSON.stringify(themeConfig, null, 2) : '{}';
  const systemPrompt = SYSTEM_PROMPT.replace('{themeJson}', themeJson);

  let result;
  try {
    result = await streamGemini(process.env.GEMINI_API_KEY, {
      contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nIMPORTANT: Keep the component code under 150 lines. Be concise.` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        maxOutputTokens: 32768,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });
  } catch (error) {
    if (error.message === 'TIMEOUT') {
      throw new ApiError(httpStatus.GATEWAY_TIMEOUT, 'AI generation timed out. Try a simpler widget.');
    }
    throw new ApiError(httpStatus.BAD_GATEWAY, `AI generation failed: ${error.message}`);
  }

  if (!result.text?.trim()) {
    if (result.finishReason === 'SAFETY') {
      throw new ApiError(httpStatus.BAD_GATEWAY, 'AI generation was blocked by safety filters. Try a different prompt.');
    }
    throw new ApiError(httpStatus.BAD_GATEWAY, 'AI returned an empty response. Try a more descriptive prompt.');
  }

  if (result.finishReason === 'MAX_TOKENS') {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'AI response was too long and got cut off. Try requesting a simpler widget.');
  }

  let text = result.text.trim();
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
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
