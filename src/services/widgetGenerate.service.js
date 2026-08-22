const axios = require('axios');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

const generateWidget = async (prompt, themeConfig) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'GEMINI_API_KEY is not configured');
  }

  const themeJson = themeConfig ? JSON.stringify(themeConfig, null, 2) : '{}';
  const systemPrompt = SYSTEM_PROMPT.replace('{themeJson}', themeJson);

  let response;
  try {
    response = await axios.post(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nIMPORTANT: Keep the component code under 150 lines. Be concise.` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: 32768,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      },
      {
        headers: { 'content-type': 'application/json' },
        timeout: 60000,
      }
    );
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new ApiError(httpStatus.GATEWAY_TIMEOUT, 'AI generation timed out. Try a simpler widget.');
    }
    const detail = error.response?.data?.error?.message || error.message;
    throw new ApiError(httpStatus.BAD_GATEWAY, `AI generation failed: ${detail}`);
  }

  const candidate = response.data?.candidates?.[0];
  if (!candidate || candidate.finishReason === 'SAFETY') {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'AI generation was blocked by safety filters. Try a different prompt.');
  }

  if (candidate.finishReason === 'MAX_TOKENS') {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'AI response was too long and got cut off. Try requesting a simpler widget.');
  }

  let text = candidate.content?.parts?.[0]?.text || '';
  if (!text.trim()) {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'AI returned an empty response. Try a more descriptive prompt.');
  }

  text = text.trim();
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
