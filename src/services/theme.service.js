const httpStatus = require('http-status');
const defaultConfig = require('../constants/initConfig');
const ThemeConfig = require('../models/themeConfig.model');
const ApiError = require('../utils/ApiError');

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGBA = /^rgba?\(/i;

const THEME_KEYS = ['spacing', 'direction', 'palette', 'status', 'divider', 'typography', 'overrides'];
const PALETTE_KEYS = ['type', 'background', 'primary', 'secondary', 'sidebar', 'gray', 'text'];
const COLOR_LEAF_KEYS = new Set([
  'main',
  'contrastText',
  'paper',
  'default',
  'primary',
  'secondary',
  'disabled',
  'hint',
  'white',
  'bgColor',
  'textColor',
  'danger',
]);

const deepMerge = (base, override) => {
  if (override === undefined || override === null) {
    return base;
  }
  if (typeof override !== 'object' || Array.isArray(override) || typeof base !== 'object' || base === null || Array.isArray(base)) {
    return override;
  }
  const out = { ...base };
  Object.keys(override).forEach((key) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
    out[key] = deepMerge(base[key], override[key]);
  });
  return out;
};

const isColorValue = (value) => typeof value === 'string' && (HEX.test(value) || RGBA.test(value));

const assertColor = (value, path) => {
  if (value == null || value === '') {
    return;
  }
  if (!isColorValue(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid hex color at ${path}`);
  }
};

const pickKnown = (obj, keys) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return undefined;
  }
  const out = {};
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      out[key] = obj[key];
    }
  });
  return out;
};

const sanitizePalette = (palette) => {
  if (!palette || typeof palette !== 'object') {
    return undefined;
  }
  const next = pickKnown(palette, PALETTE_KEYS) || {};
  ['primary', 'secondary', 'background', 'text', 'sidebar'].forEach((group) => {
    if (next[group] && typeof next[group] === 'object') {
      Object.keys(next[group]).forEach((leaf) => {
        if (COLOR_LEAF_KEYS.has(leaf) || /^\d+$/.test(leaf) || /^A\d+$/.test(leaf)) {
          assertColor(next[group][leaf], `theme.palette.${group}.${leaf}`);
        }
      });
    }
  });
  if (next.gray && typeof next.gray === 'object') {
    Object.keys(next.gray).forEach((leaf) => {
      assertColor(next.gray[leaf], `theme.palette.gray.${leaf}`);
    });
  }
  return next;
};

const sanitizeTheme = (theme) => {
  if (!theme || typeof theme !== 'object') {
    return undefined;
  }
  const next = pickKnown(theme, THEME_KEYS) || {};
  if (next.palette) {
    next.palette = sanitizePalette(next.palette);
  }
  if (next.divider != null) {
    assertColor(next.divider, 'theme.divider');
  }
  if (next.status && typeof next.status === 'object' && next.status.danger != null) {
    if (typeof next.status.danger === 'string' && !isColorValue(next.status.danger) && next.status.danger !== 'orange') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid hex color at theme.status.danger');
    }
  }
  return next;
};

const sanitizePayload = (payload = {}) => {
  const sanitized = {};
  if (payload.theme) {
    sanitized.theme = sanitizeTheme(payload.theme);
  }
  ['themeStyle', 'themeMode', 'navStyle', 'layoutType'].forEach((key) => {
    if (typeof payload[key] === 'string') {
      sanitized[key] = payload[key];
    }
  });
  return sanitized;
};

const mergeWithDefaults = (saved) => {
  const doc = saved && typeof saved.toObject === 'function' ? saved.toObject() : saved || {};
  return {
    ...defaultConfig,
    theme: deepMerge(defaultConfig.theme, doc.theme || {}),
    themeStyle: doc.themeStyle || defaultConfig.themeStyle,
    themeMode: doc.themeMode || defaultConfig.themeMode,
    navStyle: doc.navStyle || defaultConfig.navStyle,
    layoutType: doc.layoutType || defaultConfig.layoutType,
  };
};

const requireClientId = (clientId) => {
  if (!clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientId is required');
  }
};

const getTheme = async (clientId) => {
  requireClientId(clientId);
  const saved = await ThemeConfig.findOne({ client_id: clientId });
  return mergeWithDefaults(saved);
};

const saveTheme = async (clientId, payload) => {
  requireClientId(clientId);
  const sanitized = sanitizePayload(payload);
  const saved = await ThemeConfig.findOneAndUpdate(
    { client_id: clientId },
    { $set: { client_id: clientId, ...sanitized, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
  return mergeWithDefaults(saved);
};

module.exports = {
  getTheme,
  saveTheme,
  deepMerge,
  mergeWithDefaults,
  sanitizePayload,
};
