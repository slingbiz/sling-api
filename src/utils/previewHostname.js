const { isValidTenantSlugFormat } = require('./tenantSlug');

/**
 * Canonical hostname from a Host / X-Forwarded-Host style header (drops port).
 * @param {string | undefined} headerValue
 * @returns {string}
 */
function canonicalHostname(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return '';

  let raw = headerValue.split(',')[0].trim();

  raw = raw.split(':')[0].trim(); // naive port strip works for dns names

  if (!raw.startsWith('[') && raw.includes(':')) {
    const lastColon = raw.lastIndexOf(':');
    if (lastColon > 0 && /^\d+$/.test(raw.slice(lastColon + 1))) {
      raw = raw.slice(0, lastColon);
    }
  }

  return raw.toLowerCase();
}

function escapeDotsForRegex(segment) {
  return segment.replace(/\./g, '\\.');
}

/**
 * Extract tenantSlug from hostname <tenantSlug>.preview.<baseDomain> (wildcard DNS).
 * Also accepts legacy preview.<tenantSlug>.<baseDomain> during migration.
 * PREVIEW_FRONTEND_BASE_DOMAIN = parent of the preview segment (default sling.biz).
 */
function extractTenantSlugFromPreviewHostname(rawHostname) {
  const hostname = canonicalHostname(rawHostname);
  if (!hostname) return null;

  const previewLabel = (process.env.PREVIEW_SUBDOMAIN_LABEL || 'preview').toLowerCase();
  const baseDomain = (process.env.PREVIEW_FRONTEND_BASE_DOMAIN || 'sling.biz').toLowerCase();

  const escapedBase = escapeDotsForRegex(baseDomain);
  const escapedPreview = escapeDotsForRegex(previewLabel);

  const newPattern = new RegExp(
    `^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\\.${escapedPreview}\\.${escapedBase}$`,
  );
  const legacyPattern = new RegExp(
    `^${escapedPreview}\\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\\.${escapedBase}$`,
  );

  const newMatch = hostname.match(newPattern);
  const legacyMatch = hostname.match(legacyPattern);
  const slug = (newMatch?.[1] || legacyMatch?.[1] || '').toLowerCase();

  if (!slug) return null;
  return isValidTenantSlugFormat(slug) ? slug : null;
}

module.exports = {
  canonicalHostname,
  extractTenantSlugFromPreviewHostname,
};
