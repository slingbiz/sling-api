const axios = require('axios');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a React widget generator for Sling CMS. Generate a single React component called PreviewComponent.

RULES:
1. The component MUST be named PreviewComponent
2. Use Material-UI v4 (from @material-ui/core, @material-ui/icons, @material-ui/lab)
3. Use React hooks directly as bare identifiers: useState, useEffect, useCallback, useMemo, useRef (NO import statements)
4. Use MUI components as bare identifiers: Box, Typography, Button, Grid, Paper, Card, CardContent, etc. (NO import statements)
5. NO import or export statements — the code is injected into a sandbox via scope injection
6. NO window, document, fetch, eval, localStorage, XMLHttpRequest, WebSocket, or Worker access
7. NO external API calls or network requests
8. The component must be self-contained and render purely from its own state and props
9. Use makeStyles from @material-ui/core/styles for styling (available as bare identifier)
10. Generate clean, well-structured code with proper spacing

THEME CONTEXT (use these values for consistent styling):
{themeJson}

AVAILABLE LIBRARIES (use components from these as bare identifiers):
- @material-ui/core: Box, Typography, Button, Grid, Paper, Card, CardContent, CardMedia, CardActions, IconButton, TextField, Chip, Avatar, List, ListItem, ListItemText, ListItemIcon, Divider, Tab, Tabs, Switch, Checkbox, FormControlLabel, Select, MenuItem, CircularProgress, LinearProgress, Tooltip, Badge, AppBar, Toolbar, Drawer, Dialog, DialogTitle, DialogContent, DialogActions, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Slider, Rating, Pagination, Snackbar, Alert, Stepper, Step, StepLabel, Breadcrumbs, Link, Fab, SpeedDial, SpeedDialAction, SpeedDialIcon, BottomNavigation, BottomNavigationAction, Container, Hidden, Fade, Grow, Slide, Zoom, Collapse, makeStyles
- @material-ui/icons: Any Material icon as bare identifier (e.g., Star, Favorite, Home, Settings, Search, Add, Delete, Edit, Close, Menu, ArrowBack, ArrowForward, ExpandMore, ExpandLess, Check, Warning, Info, Error, Notifications, Person, ShoppingCart, etc.)
- @material-ui/lab: Autocomplete, ToggleButton, ToggleButtonGroup, Skeleton, SpeedDial, TreeView, TreeItem, Alert, AlertTitle, Rating, Pagination, TabContext, TabList, TabPanel, Timeline, TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent

OUTPUT FORMAT — respond with ONLY a JSON object (no markdown, no code fences):
{
  "name": "Human-readable widget name",
  "key": "PascalCaseKey",
  "description": "One-line description",
  "icon": "material_icon_ligature",
  "type": "widget",
  "props": [{"name": "propName", "propType": "static", "dataType": "string", "default": "defaultValue"}],
  "dependencies": {"@material-ui/core": ["Box", "Typography", ...], "@material-ui/icons": ["Star", ...]},
  "code": "const useStyles = makeStyles((theme) => ({...}));\\n\\nconst PreviewComponent = () => {\\n  ...\\n};"
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
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: 16384,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      },
      {
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    const detail = error.response?.data?.error?.message || error.message;
    throw new ApiError(httpStatus.BAD_GATEWAY, `AI generation failed: ${detail}`);
  }

  const candidate = response.data?.candidates?.[0];
  if (!candidate || candidate.finishReason === 'SAFETY') {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'AI generation was blocked by safety filters. Try a different prompt.');
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
