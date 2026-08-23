const ALLOWED_LIBRARIES = [
  'react',
  'react-dom',
  'prop-types',
  '@material-ui/core',
  '@material-ui/icons',
  '@material-ui/lab',
  '@material-ui/styles',
  '@material-ui/pickers',
  '@material-ui/core/colors',
  '@material-ui/core/styles',
  '@emotion/react',
  '@emotion/styled',
  'clsx',
  'animate.css',
  'moment',
  'date-fns',
  '@date-io/moment',
  'formik',
  'yup',
  'lodash',
  'uuid',
  'dot-object',
];

const BANNED_IDENTIFIERS = [
  'window',
  'document',
  'globalThis',
  'self',
  'parent',
  'top',
  'frames',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'process',
  'require',
  'eval',
  'Function',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'SharedWorker',
  'importScripts',
];

const stripLiterals = (code) =>
  String(code || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');

const isNamePosition = (source, index, name) => {
  const before = source.slice(0, index).trimEnd();
  const after = source.slice(index + name.length).trimStart();
  if (before.endsWith('.')) {
    return true;
  }
  if (after.startsWith(':') && !after.startsWith('::') && !before.endsWith('?')) {
    return true;
  }
  return false;
};

const usesBannedIdentifier = (source, name) => {
  const re = new RegExp(`\\b${name}\\b`, 'g');
  let match = re.exec(source);
  while (match) {
    if (!isNamePosition(source, match.index, name)) {
      return true;
    }
    match = re.exec(source);
  }
  return false;
};

const checkCodePolicy = (code, dependencies = {}) => {
  const violations = [];
  const add = (rule, message) => {
    violations.push({ rule, message });
  };

  Object.keys(dependencies || {}).forEach((lib) => {
    if (!ALLOWED_LIBRARIES.includes(lib)) {
      add('disallowed-library', `"${lib}" is not an approved library for AI-generated widgets.`);
    }
  });

  const source = stripLiterals(code);
  if (/^\s*import\s/m.test(source) || /\bimport\s*\{/.test(source)) {
    add('import-statement', 'Generated widget code must not use import statements; declare dependencies separately.');
  }
  if (/\bimport\s*\(/.test(source)) {
    add('dynamic-import', 'Dynamic import() is not permitted in generated widgets.');
  }

  BANNED_IDENTIFIERS.forEach((name) => {
    if (usesBannedIdentifier(source, name)) {
      add('banned-identifier', `Use of "${name}" is not permitted in generated widgets.`);
    }
  });

  const seen = new Set();
  const deduped = violations.filter((item) => {
    const key = `${item.rule}:${item.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return {
    allowed: deduped.length === 0,
    violations: deduped,
  };
};

module.exports = {
  checkCodePolicy,
  ALLOWED_LIBRARIES,
  BANNED_IDENTIFIERS,
};
