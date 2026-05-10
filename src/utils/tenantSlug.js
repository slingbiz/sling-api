/** Subdomain labels for preview hosts: preview.<tenantSlug>.<baseDomain> */

const RESERVED_TENANT_SLUGS = new Set([
  'www',
  'api',
  'admin',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'app',
  'apps',
  'studio',
  'preview',
  'demo',
  'status',
  'metrics',
]);

const MAX_LABEL_LENGTH = 63;

const stripCombiningMarks = (str) => str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

/** @returns {boolean} RFC-like DNS label checks (hyphen boundaries, chars, length) */
function isValidTenantSlugFormat(slug) {
  if (!slug || slug.length > MAX_LABEL_LENGTH) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return false;
  return true;
}

/**
 * Turn arbitrary text into a single DNS-label-style slug fragment (not yet uniqueness-checked).
 * @param {string} raw
 */
function slugifyTenantSource(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let s = stripCombiningMarks(raw.trim()).toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '-');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^-|-$/g, '');

  if (s.length > MAX_LABEL_LENGTH) {
    s = s.slice(0, MAX_LABEL_LENGTH).replace(/-+$/g, '');
  }

  if (!isValidTenantSlugFormat(s)) return '';

  return s;
}

/** @param {string} email */
function slugifyEmailLocalPart(email) {
  if (!email || typeof email !== 'string') return '';
  const local = email.split('@')[0] || '';
  return slugifyTenantSource(local.replace(/\./g, '-'));
}

/**
 * Apply reserved-word policy by suffixing (-site) and re-validating length.
 * @param {string} slug
 */
function avoidReservedTenantSlug(slug) {
  if (!slug) return '';
  if (!RESERVED_TENANT_SLUGS.has(slug)) return slug;

  const suffix = '-site';
  const maxBase = MAX_LABEL_LENGTH - suffix.length;
  const base = maxBase > 0 ? slug.slice(0, maxBase).replace(/-+$/g, '') : 'tenant';
  const next = `${base}${suffix}`;
  return isValidTenantSlugFormat(next) ? next : '';
}

/**
 * Prefer company name, then org name, then email local-part; always returns a non-empty slug.
 * @param {{ companyName?: string, orgName?: string, email?: string }} sources
 */
function getTenantSlugCandidate(sources = {}) {
  const { companyName, orgName, email } = sources;

  const candidates = [
    avoidReservedTenantSlug(slugifyTenantSource(companyName || '')),
    avoidReservedTenantSlug(slugifyTenantSource(orgName || '')),
    avoidReservedTenantSlug(slugifyEmailLocalPart(email || '')),
  ].filter(Boolean);

  const first = candidates.find((s) => isValidTenantSlugFormat(s));
  if (first) return first;

  return 'tenant';
}

/**
 * Build slug for attempt 0 (base) or attempt n>=1 (base truncated + "-n").
 * @param {string} baseSlug
 * @param {number} attemptIndex
 */
function formatTenantSlugWithAttempt(baseSlug, attemptIndex) {
  const base =
    baseSlug && isValidTenantSlugFormat(baseSlug) ? baseSlug : getTenantSlugCandidate({});
  if (attemptIndex <= 0) return base;

  const suffix = `-${attemptIndex}`;
  const maxBaseLen = MAX_LABEL_LENGTH - suffix.length;
  if (maxBaseLen < 1) return `t${suffix}`.slice(0, MAX_LABEL_LENGTH);

  let trimmed = base.slice(0, maxBaseLen).replace(/-+$/g, '');
  if (!trimmed) trimmed = 't';
  const label = `${trimmed}${suffix}`;
  return isValidTenantSlugFormat(label) ? label : getTenantSlugCandidate({});
}

/**
 * True when we should replace the user-submitted clientUrl with the generated preview URL.
 * @param {string} [clientUrl]
 */
function shouldReplaceWithPreviewClientUrl(clientUrl) {
  if (clientUrl == null) return true;
  const trimmed = String(clientUrl).trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('http://localhost') || lower.startsWith('https://localhost')) return true;
  if (lower.includes('127.0.0.1')) return true;

  return false;
}

module.exports = {
  RESERVED_TENANT_SLUGS,
  MAX_LABEL_LENGTH,
  isValidTenantSlugFormat,
  slugifyTenantSource,
  slugifyEmailLocalPart,
  getTenantSlugCandidate,
  formatTenantSlugWithAttempt,
  shouldReplaceWithPreviewClientUrl,
};
