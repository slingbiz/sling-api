const {
  MSG_MANY,
  MSG_SIGNUP,
  hasUsableStorefrontAuth,
  isAutoTenantEnabled,
  isUsableClientId,
  isUsableLicense,
  resolveAutoTenant,
} = require('./storefrontAutoTenant');

describe('storefrontAutoTenant', () => {
  describe('isAutoTenantEnabled', () => {
    it('is off unless the installer flag is set', () => {
      expect(isAutoTenantEnabled({})).toBe(false);
      expect(isAutoTenantEnabled({ STOREFRONT_AUTO_TENANT: '' })).toBe(false);
      expect(isAutoTenantEnabled({ NODE_ENV: 'development' })).toBe(false);
    });

    it('is on for 1 / true / yes', () => {
      expect(isAutoTenantEnabled({ STOREFRONT_AUTO_TENANT: '1' })).toBe(true);
      expect(isAutoTenantEnabled({ STOREFRONT_AUTO_TENANT: 'true' })).toBe(true);
      expect(isAutoTenantEnabled({ STOREFRONT_AUTO_TENANT: 'YES' })).toBe(true);
    });
  });

  describe('usable auth headers', () => {
    it('rejects empty and installer placeholders', () => {
      expect(isUsableLicense('')).toBe(false);
      expect(isUsableLicense('undefined')).toBe(false);
      expect(isUsableLicense('your-sling-secret-key')).toBe(false);
      expect(isUsableClientId('your@email.id')).toBe(false);
      expect(hasUsableStorefrontAuth('your-sling-secret-key', 'you@x.com')).toBe(false);
    });

    it('accepts a real key pair', () => {
      expect(hasUsableStorefrontAuth('abc-123', 'you@x.com')).toBe(true);
    });
  });

  describe('resolveAutoTenant', () => {
    it('asks for Studio signup when there is no company', () => {
      expect(resolveAutoTenant([])).toEqual({ ok: false, status: 400, message: MSG_SIGNUP });
      expect(resolveAutoTenant([{ email: 'a@b.com' }])).toEqual({
        ok: false,
        status: 400,
        message: MSG_SIGNUP,
      });
    });

    it('uses the only company with a key', () => {
      expect(
        resolveAutoTenant([{ email: 'one@x.com', apiKey: 'k1', user: 'one@x.com' }]),
      ).toEqual({ ok: true, clientId: 'one@x.com' });
    });

    it('stops guessing when a second company exists', () => {
      expect(
        resolveAutoTenant([
          { email: 'one@x.com', apiKey: 'k1' },
          { email: 'two@x.com', apiKey: 'k2' },
        ]),
      ).toEqual({ ok: false, status: 400, message: MSG_MANY });
    });
  });
});
