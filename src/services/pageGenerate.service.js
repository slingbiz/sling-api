const { generateGeminiText, streamGeminiText, isGeminiTextConfigured } = require('./geminiText.service');
const { parseResponse, extractTopLevelJSON } = require('./widgetGenerate.service');

const SYSTEM_PROMPT = `You generate a web page as a list of CMS widgets. One shot. Do not rewrite later.

The page is made of 5 or 6 named sections. Each section IS a widget: its own PreviewComponent, props, and dependencies.

CONSTRAINTS for every section (same as a Sling widget):
- Component MUST be named PreviewComponent (bare declaration, no exports)
- MUI v4 components as bare identifiers (no imports)
- MUI icons as bare identifiers
- React hooks as bare identifiers: useState, useEffect, useCallback, useMemo
- NO imports, NO exports, NO window/document/fetch/eval/localStorage
- Use makeStyles for all styling
- MAXIMUM 80 lines of code per section
- Each section is a slice of ONE page. Height follows content. No overflow:auto, overflow:scroll, 100vh, minHeight 100vh, or inner scrollbars.
- RESPONSIVE: Studio places this widget in a 12-column grid. It may be full width or half width. It must look correct at both, and on a phone.
- Side-by-side cards/stats/columns MUST use Grid: <Grid container spacing={2}> and <Grid item xs={12} sm={6} md={4}>. Stack on xs.
- makeStyles MUST use theme.breakpoints: smaller padding and type on sm, larger on md. Example: padding: theme.spacing(2), [theme.breakpoints.up('md')]: { padding: theme.spacing(6) }.
- Never set a px width over the container. No minWidth that overflows a phone. Images: maxWidth: '100%', height: 'auto'.
- Include Grid in dependencies when you use it.
- No hover effects, no transitions, no lift-on-hover CSS (Studio draws section boxes)
- Use theme.palette for colors. If a tenant theme palette is provided, use it.
- Use theme.palette.primary.main, theme.palette.secondary.main, and theme.palette.text.primary. Do not read primary[400] or other shade indexes.
- Icons: use <Icon>speed</Icon> (MUI Icon ligature). Do not use Speed, SpeedIcon, or other undeclared icon components — those throw "X is not defined".
- Do not wrap the page in one giant component. Emit separate sections.

RESPONSE FORMAT — return EXACTLY this structure:

---PAGE---
{"title":"Clinic home","key":"clinic-home","path":"/clinic-home","description":"One line of what this page is"}
---SECTION---
{"id":"hero","label":"Hero banner widget","name":"Hero banner widget","key":"HeroBanner","description":"Headline and CTA","icon":"star","type":"widget","props":[],"dependencies":{"@material-ui/core":["Box","Typography","Button"]}}
---CODE---
const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(4) }
}));

const PreviewComponent = () => {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      <Typography variant="h4">Headline</Typography>
    </Box>
  );
};
---END---
---SECTION---
{"id":"features","label":"Features widget","name":"Features widget","key":"FeatureGrid","description":"Three feature cards","icon":"widgets","type":"widget","props":[],"dependencies":{"@material-ui/core":["Box","Typography","Grid"]}}
---CODE---
const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    [theme.breakpoints.up('md')]: {padding: theme.spacing(4)},
  },
  media: {maxWidth: '100%', height: 'auto'},
}));

const PreviewComponent = () => {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      <Typography variant="h6">Features</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}><Typography>One</Typography></Grid>
        <Grid item xs={12} sm={6} md={4}><Typography>Two</Typography></Grid>
        <Grid item xs={12} sm={6} md={4}><Typography>Three</Typography></Grid>
      </Grid>
    </Box>
  );
};
---END---

PAGE.key is a lowercase hyphen slug. PAGE.path is a unique kebab URL like /clinic-home. Never use / unless they asked for the site homepage, and even then prefer /home if / is taken.
SECTION.id is a stable slug. SECTION.label is the human name shown on hover in Studio. It MUST end with the word "widget", e.g. "Hero banner widget".
SECTION.key is PascalCase and unique on the page.
Do NOT wrap code in backticks.`;

function ensureWidgetLabel(label) {
  const raw = String(label || 'Section').trim() || 'Section';
  if (/\bwidget$/i.test(raw)) return raw;
  return `${raw} widget`;
}

function normalizePage(page) {
  const key = String(page.key || page.title || 'page')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'page';
  let path = String(page.path || '').trim();
  if (!path || path === '/') {
    path = `/${key === 'home' ? 'home' : key}`;
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return {
    title: page.title || 'New page',
    key,
    path,
    description: page.description || 'Generated page',
  };
}

function tryParsePageMeta(raw) {
  const pageMatch = String(raw || '').match(/---PAGE---\s*([\s\S]*?)\s*---SECTION---/);
  if (!pageMatch) return null;
  const pageJson = extractTopLevelJSON(pageMatch[1].trim());
  try {
    const page = JSON.parse(pageJson || pageMatch[1].trim());
    if (!page || typeof page !== 'object') return null;
    return normalizePage(page);
  } catch (e) {
    return null;
  }
}

function parseSectionChunk(chunk, index) {
  if (!/---CODE---/.test(chunk) || !/---END---/.test(chunk)) return null;
  let widget;
  try {
    widget = parseResponse(`---META---\n${chunk}`);
  } catch (err) {
    throw new Error(`Section ${index + 1} failed: ${err.message}`);
  }
  const metaJson = extractTopLevelJSON(chunk);
  let extra = {};
  try {
    extra = JSON.parse(metaJson || '{}');
  } catch (e) {
    extra = {};
  }
  const id = extra.id || widget.key || `section-${index + 1}`;
  return {
    id: String(id).replace(/[^a-zA-Z0-9_-]/g, '-') || `section-${index + 1}`,
    label: ensureWidgetLabel(extra.label || widget.name || `Section ${index + 1}`),
    name: ensureWidgetLabel(widget.name || extra.label || extra.name),
    key: widget.key,
    description: widget.description || extra.description || '',
    icon: widget.icon || extra.icon || 'widgets',
    type: 'widget',
    props: widget.props || [],
    dependencies: widget.dependencies || {},
    code: widget.code,
  };
}

function listCompletedSections(raw, options = {}) {
  const sectionChunks = String(raw || '').split('---SECTION---').slice(1);
  const sections = [];
  sectionChunks.forEach((chunk, index) => {
    try {
      const section = parseSectionChunk(chunk, index);
      if (section) sections.push(section);
    } catch (err) {
      if (!options.soft) throw err;
    }
  });
  return sections;
}

function parsePageResponse(raw) {
  if (!raw || !String(raw).trim()) {
    throw new Error('AI returned an empty page.');
  }
  const page = tryParsePageMeta(raw);
  if (!page) {
    throw new Error('AI response missing PAGE and SECTION blocks.');
  }

  const sections = listCompletedSections(raw);
  if (sections.length < 5) {
    throw new Error('AI must return at least five sections so the page can be processed into widgets.');
  }
  if (sections.length > 8) {
    sections.length = 8;
  }

  return { page, sections };
}

function buildUserPrompt(prompt, themeConfig, options = {}) {
  const themeNote = themeConfig
    ? `\nUse this tenant theme palette: ${JSON.stringify(themeConfig).substring(0, 500)}`
    : '';
  if (options.followUp && options.previous?.page) {
    const labels = (options.previous.sections || [])
      .map((section) => section.label || section.name)
      .filter(Boolean)
      .join(', ');
    return `Revise this page. Keep 5 or 6 widgets. Every section label must end with "widget".
Original ask: ${prompt}
Change to make: ${options.followUp}
Keep page title/key/path if they still fit: ${JSON.stringify(options.previous.page)}
Current widgets: ${labels || 'none'}
Return the FULL page in the same ---PAGE--- / ---SECTION--- format.
Keep each section under 80 lines.${themeNote}`;
  }
  return `Build this page as 5 or 6 widgets: ${prompt}\nEvery section label must end with "widget" (Hero banner widget).\nKeep each section under 80 lines.${themeNote}`;
}

async function generatePage(prompt, themeConfig, options = {}) {
  if (!isGeminiTextConfigured()) {
    const err = new Error('Gemini API key is not configured');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }
  const userPrompt = buildUserPrompt(prompt, themeConfig, options);
  const raw = await generateGeminiText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 16384,
    temperature: 0.5,
    jsonMode: false,
  });
  return parsePageResponse(raw);
}

async function streamPage(prompt, themeConfig, sendEvent, options = {}) {
  if (!isGeminiTextConfigured()) {
    const err = new Error('Gemini API key is not configured');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }
  const userPrompt = buildUserPrompt(prompt, themeConfig, options);

  sendEvent({ type: 'status', message: options.followUp ? 'Improving…' : 'Streaming…' });

  let lastLen = 0;
  let pageSent = false;
  const emitted = new Set();

  const fullText = await streamGeminiText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 16384,
    temperature: 0.5,
    onText: (text) => {
      if (text.length > lastLen) {
        sendEvent({ type: 'code_token', text: text.substring(lastLen) });
        lastLen = text.length;
      }
      if (!pageSent) {
        const page = tryParsePageMeta(text);
        if (page) {
          pageSent = true;
          sendEvent({ type: 'page', page });
        }
      }
      listCompletedSections(text, {soft: true}).forEach((section) => {
        if (emitted.has(section.id)) return;
        emitted.add(section.id);
        sendEvent({ type: 'section', section });
        sendEvent({ type: 'status', message: `${section.label} ready` });
      });
    },
  });

  const result = parsePageResponse(fullText);
  sendEvent({ type: 'complete', page: result.page, sections: result.sections });
  return result;
}

module.exports = {
  generatePage,
  streamPage,
  parsePageResponse,
  tryParsePageMeta,
  listCompletedSections,
  ensureWidgetLabel,
  SYSTEM_PROMPT,
};
