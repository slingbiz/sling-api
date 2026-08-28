const PLACEHOLDER_LICENSES = new Set(['undefined', 'null', 'your-sling-secret-key']);
const PLACEHOLDER_CLIENTS = new Set(['undefined', 'null', 'your@email.id', 'your@email.com']);

const MSG_SIGNUP =
  'Sign up in Studio at http://localhost:2021, then refresh this site.';
const MSG_MANY =
  'This machine has more than one company. Open Studio → Settings → Keys, paste that company’s key and email into sling-fe/.env, then restart the storefront.';

function isAutoTenantEnabled(env = process.env) {
  const raw = String(env.STOREFRONT_AUTO_TENANT || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function isUsableStorefrontValue(value, placeholders) {
  const v = String(value ?? '').trim();
  if (!v) return false;
  return !placeholders.has(v.toLowerCase());
}

function isUsableLicense(value) {
  return isUsableStorefrontValue(value, PLACEHOLDER_LICENSES);
}

function isUsableClientId(value) {
  return isUsableStorefrontValue(value, PLACEHOLDER_CLIENTS);
}

function hasUsableStorefrontAuth(license, clientId) {
  return isUsableLicense(license) && isUsableClientId(clientId);
}

function companiesWithKeys(docs) {
  return (docs || []).filter((row) => {
    if (!row || !String(row.apiKey || '').trim()) return false;
    return Boolean(String(row.email || row.user || '').trim());
  });
}

function resolveAutoTenant(docs) {
  const companies = companiesWithKeys(docs);
  if (companies.length === 0) {
    return { ok: false, status: 400, message: MSG_SIGNUP };
  }
  if (companies.length === 1) {
    const company = companies[0];
    return { ok: true, clientId: String(company.email || company.user) };
  }
  return { ok: false, status: 400, message: MSG_MANY };
}

module.exports = {
  MSG_MANY,
  MSG_SIGNUP,
  hasUsableStorefrontAuth,
  isAutoTenantEnabled,
  isUsableClientId,
  isUsableLicense,
  resolveAutoTenant,
};
