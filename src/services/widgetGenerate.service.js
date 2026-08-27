const { generateGeminiText, isGeminiTextConfigured, getGeminiTextConfig } = require('./geminiText.service');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const SYSTEM_PROMPT = `Generate a React component named PreviewComponent for a CMS widget.

CONSTRAINTS:
- Component MUST be named PreviewComponent (bare declaration, no exports)
- MUI v4 components as bare identifiers (no imports): Box, Typography, Button, Grid, Paper, Card, CardContent, CardMedia, CardActions, IconButton, TextField, Chip, Avatar, List, ListItem, ListItemText, ListItemIcon, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch, Checkbox, Select, MenuItem, Tooltip, Badge, LinearProgress, CircularProgress, Tabs, Tab, FormControlLabel, makeStyles
- MUI icons as bare identifiers: Star, Favorite, Check, Close, Add, Delete, Edit, Info, Warning, Person, ShoppingCart, ExpandMore, ExpandLess, Search, Settings, Home, CheckCircle, Cancel, ArrowForward, TrendingUp, AttachMoney, Email, Phone, LocationOn
- React hooks as bare identifiers: useState, useEffect, useCallback, useMemo
- NO imports, NO exports, NO window/document/fetch/eval/localStorage
- Use makeStyles for all styling
- MAXIMUM 80 lines of code. Keep it concise.
- Inline sample data as simple arrays/objects
- Simple clean layouts only. No animations, no hover effects, no transitions.
- Use theme.spacing() for consistent spacing
- RESPONSIVE: this widget may sit in a full-width or half-width grid cell. Use Grid with xs={12} sm={6} for columns. Use theme.breakpoints in makeStyles. Images maxWidth 100%. No fixed px widths that overflow a phone.
- Use theme.palette for colors. If a tenant theme palette is provided, use it.
- Use theme.palette.primary.main, theme.palette.secondary.main, and theme.palette.text.primary. Do not read primary[400] or other shade indexes.
- Forms (login, signup, newsletter) MUST render visible outlined TextFields with labels, a primary contained Button, and padding. Never return an empty white box.

RESPONSE FORMAT — return EXACTLY this structure:

---META---
{"name":"Widget Name","key":"PascalCaseKey","description":"Short description","icon":"star","type":"widget","props":[],"dependencies":{"@material-ui/core":["Box","Typography"],"@material-ui/icons":["Star"]}}
---CODE---
const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(2) }
}));

const PreviewComponent = () => {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      <Typography variant="h6">Hello</Typography>
    </Box>
  );
};
---END---

CRITICAL: The dependencies object MUST list every MUI component and icon used in the code. Missing dependencies will cause render failure.
Do NOT wrap code in backticks or quotes. Write raw JSX between ---CODE--- and ---END---.`;

const MUI_CORE_COMPONENTS = [
  'Accordion','AccordionDetails','AccordionSummary','AppBar','Avatar',
  'Backdrop','Badge','Box','Breadcrumbs','Button','ButtonGroup',
  'Card','CardActionArea','CardActions','CardContent','CardHeader','CardMedia',
  'Checkbox','Chip','CircularProgress','Collapse','Container',
  'Dialog','DialogActions','DialogContent','DialogContentText','DialogTitle',
  'Divider','Drawer',
  'Fab','FormControl','FormControlLabel','FormGroup','FormHelperText','FormLabel',
  'Grid',
  'Icon','IconButton','Input','InputAdornment','InputBase','InputLabel',
  'LinearProgress','Link','List','ListItem','ListItemAvatar','ListItemIcon',
  'ListItemSecondaryAction','ListItemText','ListSubheader',
  'Menu','MenuItem','MenuList','Modal',
  'OutlinedInput',
  'Pagination','Paper','Popover',
  'Radio','RadioGroup',
  'Select','Skeleton','Slider','Snackbar','Step','StepLabel','Stepper','Switch',
  'Tab','Table','TableBody','TableCell','TableContainer','TableHead',
  'TablePagination','TableRow','TableSortLabel','Tabs',
  'TextField','Toolbar','Tooltip','Typography',
];

const MUI_ICONS = [
  'AccessTime','AccountCircle','Add','AddCircle','ArrowBack','ArrowDownward',
  'ArrowForward','ArrowUpward','Assessment','Assignment','AttachFile','AttachMoney',
  'Bookmark','BookmarkBorder','Build','BugReport',
  'CalendarToday','Camera','Cancel','Chat','Check','CheckCircle','ChevronLeft',
  'ChevronRight','Close','Cloud','CloudDownload','CloudUpload','Code','Comment',
  'ContentCopy','Create',
  'Dashboard','DarkMode','Delete','Description','Done','DoneAll','Download',
  'Edit','Email','Error','ExpandLess','ExpandMore','Explore',
  'Face','Favorite','FavoriteBorder','FileCopy','FilterList','Flag','Folder',
  'FormatBold','FormatItalic',
  'GetApp','Grade','Group',
  'Help','HelpOutline','History','Home',
  'Image','Info','InsertChart',
  'KeyboardArrowDown','KeyboardArrowLeft','KeyboardArrowRight','KeyboardArrowUp',
  'Label','Language','Launch','LightMode','Link','LocationOn','Lock','LockOpen',
  'Mail','Menu','Message','Mic','MoreHoriz','MoreVert','MusicNote',
  'NavigateNext','Notifications',
  'OpenInNew',
  'Palette','Pause','People','Person','PersonAdd','Phone','PhotoCamera',
  'PlayArrow','Print','Public',
  'Refresh','Remove','RemoveCircle','Reply','Report',
  'Save','Schedule','School','Search','Security','Send','Settings','Share',
  'ShoppingCart','Sort','Speed','Star','StarBorder','StarHalf','Stop',
  'ThumbDown','ThumbUp','Timer','Today','TrendingDown','TrendingFlat','TrendingUp',
  'Upload',
  'Verified','Visibility','VisibilityOff','VolumeUp',
  'Warning','Wifi','Work',
];

function detectDependencies(code) {
  const deps = {};
  const usedCore = MUI_CORE_COMPONENTS.filter(c => new RegExp(`\\b${c}\\b`).test(code));
  const usedIcons = MUI_ICONS.filter(c => new RegExp(`\\b${c}\\b`).test(code));
  if (usedCore.length) deps['@material-ui/core'] = usedCore;
  if (usedIcons.length) deps['@material-ui/icons'] = usedIcons;
  return deps;
}

function mergeDependencies(declared, detected) {
  const merged = {};
  const allLibs = new Set([...Object.keys(declared), ...Object.keys(detected)]);
  for (const lib of allLibs) {
    merged[lib] = [...new Set([...(declared[lib] || []), ...(detected[lib] || [])])];
  }
  return merged;
}

function extractTopLevelJSON(text) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}') { depth--; if (depth === 0 && start !== -1) return text.substring(start, i + 1); }
  }
  return null;
}

function parseResponse(raw) {
  const metaMatch = raw.match(/---META---\s*([\s\S]*?)\s*---CODE---/);
  if (metaMatch) {
    let code;
    const codeMatch = raw.match(/---CODE---\s*([\s\S]*?)\s*---END---/);
    if (codeMatch) {
      code = codeMatch[1].trim();
    } else {
      const idx = raw.indexOf('---CODE---');
      code = raw.substring(idx + '---CODE---'.length).trim().replace(/\n?```\s*$/, '').trim();
    }
    const metaText = metaMatch[1].trim();
    const metaJson = extractTopLevelJSON(metaText);
    let meta;
    try { meta = JSON.parse(metaJson || metaText); }
    catch (e) { throw new Error(`Failed to parse widget metadata: ${metaText.substring(0, 200)}`); }
    if (!code) throw new Error('AI generated empty widget code');
    const detected = detectDependencies(code);
    const deps = mergeDependencies(meta.dependencies || {}, detected);
    return {
      code, dependencies: deps,
      name: meta.name || 'Widget', description: meta.description || '',
      key: meta.key || 'CustomWidget', icon: meta.icon || 'widgets',
      type: meta.type || 'widget', props: meta.props || [],
    };
  }

  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  const jsonText = extractTopLevelJSON(text);
  if (!jsonText) throw new Error(`AI response was not valid JSON: ${text.substring(0, 300)}`);
  let parsed;
  try { parsed = JSON.parse(jsonText); }
  catch { throw new Error(`AI response was not valid JSON: ${jsonText.substring(0, 300)}`); }
  if (!parsed.code) throw new Error('AI response missing code field');
  const detected = detectDependencies(parsed.code);
  const deps = mergeDependencies(parsed.dependencies || {}, detected);
  return {
    code: parsed.code, dependencies: deps,
    name: parsed.name || 'Widget', description: parsed.description || '',
    key: parsed.key || 'CustomWidget', icon: parsed.icon || 'widgets',
    type: parsed.type || 'widget', props: parsed.props || [],
  };
}

function buildThemeInstruction(prompt, themeConfig) {
  const themeNote = themeConfig
    ? `\nUse this tenant theme palette: ${JSON.stringify(themeConfig).substring(0, 500)}`
    : '\nUse the provided theme palette if any; otherwise Material-UI defaults.';
  const userPrompt = `Create a widget: ${prompt}\n\nKeep it under 80 lines. Simple, clean, and visually complete.${themeNote}`;
  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

async function generateWidget(prompt, themeConfig) {
  if (!isGeminiTextConfigured()) throw new Error('Gemini API key is not configured');
  const { systemPrompt, userPrompt } = buildThemeInstruction(prompt, themeConfig);
  const raw = await generateGeminiText({
    systemPrompt, userPrompt, maxTokens: 8192, temperature: 0.5, jsonMode: false,
  });
  if (!raw || !raw.trim()) throw new Error('AI returned an empty response. Try a more descriptive prompt.');
  return parseResponse(raw);
}

async function streamWidget(prompt, themeConfig, sendEvent) {
  const { apiKey, model } = getGeminiTextConfig();
  if (!apiKey) throw new Error('Gemini API key is not configured');

  const { userPrompt } = buildThemeInstruction(prompt, themeConfig);

  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.5,
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gemini API error (${response.status})`);
  }

  let fullText = '';
  let sentCodeLen = 0;
  let codeStartSent = false;

  const processChunk = (chunk) => {
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (!json || json === '[DONE]') continue;
      try {
        const data = JSON.parse(json);
        for (const part of (data?.candidates?.[0]?.content?.parts || [])) {
          if (part.thought === true || !part.text) continue;
          fullText += part.text;
        }
      } catch {}
    }

    const codeIdx = fullText.indexOf('---CODE---');
    if (codeIdx === -1) return;
    if (!codeStartSent) { sendEvent({ type: 'code_start' }); codeStartSent = true; }
    const codeStart = codeIdx + '---CODE---'.length;
    const endIdx = fullText.indexOf('---END---');
    const codeEnd = endIdx !== -1 ? endIdx : fullText.length;
    let code = fullText.substring(codeStart, codeEnd);
    if (sentCodeLen === 0) code = code.replace(/^\s+/, '');
    if (code.length > sentCodeLen) {
      sendEvent({ type: 'code_token', text: code.substring(sentCodeLen) });
      sentCodeLen = code.length;
    }
  };

  // Read the stream - handle both Web ReadableStream and Node.js Readable
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
      for (const part of parts) processChunk(part);
    }
    if (sseBuffer.trim()) processChunk(sseBuffer);
  } else {
    const decoder = new TextDecoder();
    let sseBuffer = '';
    for await (const chunk of response.body) {
      sseBuffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
      const parts = sseBuffer.split('\n\n');
      sseBuffer = parts.pop();
      for (const part of parts) processChunk(part);
    }
    if (sseBuffer.trim()) processChunk(sseBuffer);
  }

  const widget = parseResponse(fullText);
  sendEvent({ type: 'complete', widget });
  return widget;
}

module.exports = { generateWidget, streamWidget, parseResponse, buildThemeInstruction, extractTopLevelJSON };
