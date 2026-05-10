const { getDb } = require('../utils/mongoInit');
const logger = require('../config/logger');
const Account = require('../models/account.model');
const { canonicalHostname, extractTenantSlugFromPreviewHostname } = require('../utils/previewHostname');

function pickInboundHost(req) {
  const raw =
    req.header('x-sling-origin-host') ||
    req.header('x-forwarded-host') ||
    req.header('host') ||
    '';
  return canonicalHostname(raw);
}

/** @returns {string|null} */
function previewInitSecretConfigured() {
  const v = process.env.SLING_PREVIEW_INIT_SECRET;
  if (typeof v === 'string' && v.length > 0) return v;
  return null;
}

const setClientFE = async (req, res, next) => {
  try {
    const previewSecret = previewInitSecretConfigured();
    const inboundHost = pickInboundHost(req);

    const tenantSlugGuess = previewSecret ? extractTenantSlugFromPreviewHostname(inboundHost) : null;

    if (tenantSlugGuess && previewSecret) {
      const sentSecret = req.header('x-sling-preview-init-secret');
      if (!sentSecret) {
        logger.warn('[setClientFE] Preview host parsed but missing x-sling-preview-init-secret');
        return res.status(403).json({
          error: {
            message: 'Preview storefront bootstrap credential missing.',
          },
        });
      }
      if (sentSecret !== previewSecret) {
        logger.warn('[setClientFE] Invalid preview bootstrap secret');
        return res.status(403).json({
          error: {
            message: 'Invalid preview storefront credentials.',
          },
        });
      }

      const tenant = await Account.findOne({ tenantSlug: tenantSlugGuess }).select(['user', 'email']);
      const ownerKey = tenant?.user ? String(tenant.user) : '';
      const emailKey = tenant?.email ? String(tenant.email) : '';

      if (!ownerKey && !emailKey) {
        logger.warn(`[setClientFE] Unknown tenantSlug from preview hostname: "${tenantSlugGuess}"`);
        return res.status(404).json({
          error: {
            message: 'Unknown preview storefront tenant.',
          },
        });
      }

      req.clientId = ownerKey || emailKey || 'demo-id';
      logger.info(`[setClientFE] Resolved clientId via preview host slug "${tenantSlugGuess}" -> "${req.clientId}"`);
      next();
      return;
    }

    const clientId = req.header('client');
    const license = req.header('license');
    const authHeader = req.header('authorization') || req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    logger.info('=== [setClientFE] Request Details ===');
    logger.info(`[setClientFE] Client ID from header: "${clientId}"`);
    logger.info(`[setClientFE] License/API Key from header: "${license ? `${license.substring(0, 10)}...` : 'NOT PROVIDED'}"`);
    logger.info(`[setClientFE] Authorization header: "${authHeader ? 'PROVIDED' : 'NOT PROVIDED'}"`);
    logger.info(`[setClientFE] Token (first 20 chars): "${token ? `${token.substring(0, 20)}...` : 'NOT PROVIDED'}"`);
    logger.info(`[setClientFE] Request path: ${req.path}`);
    logger.info(`[setClientFE] Request method: ${req.method}`);
    logger.info(`[setClientFE] Inbound storefront host hint: "${inboundHost || 'n/a'}"`);

    if (!clientId || !license) {
      logger.warn(`[setClientFE] Missing client ID or license - clientId: "${clientId}", license: "${license ? 'PROVIDED' : 'NOT PROVIDED'}"`);
      return res.status(400).json({
        error: {
          message: 'Unauthenticated Access. Please contact admin.',
        },
      });
    }

    const db = getDb();

    logger.info(`[setClientFE] Looking up client_meta for apiKey: "${license.substring(0, 10)}..."`);
    const user = (await db.collection('client_meta').findOne({ apiKey: license })) || {};

    logger.info(`[setClientFE] Client meta lookup result:`);
    logger.info(`[setClientFE]   - Found user: ${user._id ? 'YES' : 'NO'}`);
    if (user._id) {
      logger.info(`[setClientFE]   - User email from DB: "${user.email}"`);
      logger.info(`[setClientFE]   - User _id: "${user._id}"`);
      logger.info(`[setClientFE]   - User client_id: "${user.client_id || 'NOT SET'}"`);
    }

    if (!user._id) {
      logger.error(`[setClientFE] Invalid Secret key - no client_meta found for provided license`);
      return res.status(400).json({
        error: {
          message: 'Invalid Secret key. Please contact admin.',
        },
      });
    }

    logger.info(`[setClientFE] Validating client ID match:`);
    logger.info(`[setClientFE]   - Client ID from header: "${clientId}"`);
    logger.info(`[setClientFE]   - Email from client_meta: "${user.email}"`);
    logger.info(`[setClientFE]   - Match: ${user.email === clientId ? '✓ YES' : '✗ NO'}`);

    if (user.email !== clientId) {
      logger.error(`[setClientFE] ✗ VALIDATION FAILED - Client ID mismatch!`);
      logger.error(`[setClientFE]   Header client: "${clientId}"`);
      logger.error(`[setClientFE]   DB email: "${user.email}"`);
      console.log('[setClientFe] - [Invalid Secret Key or Client Id. Please contact admin]', clientId, user.email);
      return res.status(400).json({
        error: {
          message: 'Invalid Secret Key or Client Id. Please contact admin.',
        },
      });
    }

    req.clientId = clientId || 'demo-id';
    logger.info(`[setClientFE] ✓ Validation passed - Setting req.clientId: "${req.clientId}"`);
    logger.info('=== [setClientFE] Validation Complete ===');

    next();
  } catch (error) {
    logger.error(`[setClientFE] Exception: ${error.message}`);
    logger.error(`[setClientFE] Stack: ${error.stack}`);
    console.log(error.message, 'Exception @setClientFe ');
    return res.status(500).json({
      error,
    });
  }
};

module.exports = setClientFE;
