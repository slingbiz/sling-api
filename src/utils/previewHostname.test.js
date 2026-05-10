const { canonicalHostname, extractTenantSlugFromPreviewHostname } = require('./previewHostname');

describe('previewHostname', () => {
  describe('canonicalHostname', () => {
    it('strips commas, spaces, and naive host ports', () => {
      expect(canonicalHostname('Preview.ACME.Sling.biz:443')).toBe('preview.acme.sling.biz');
      expect(canonicalHostname(' acme.preview.com, upstream.test ')).toBe('acme.preview.com');
    });
  });

  describe('extractTenantSlugFromPreviewHostname', () => {
    const prevBase = process.env.PREVIEW_FRONTEND_BASE_DOMAIN;
    const prevLabel = process.env.PREVIEW_SUBDOMAIN_LABEL;

    afterEach(() => {
      if (prevBase === undefined) delete process.env.PREVIEW_FRONTEND_BASE_DOMAIN;
      else process.env.PREVIEW_FRONTEND_BASE_DOMAIN = prevBase;
      if (prevLabel === undefined) delete process.env.PREVIEW_SUBDOMAIN_LABEL;
      else process.env.PREVIEW_SUBDOMAIN_LABEL = prevLabel;
    });

    it('extracts slug for <slug>.preview.sling.biz (wildcard DNS shape)', () => {
      delete process.env.PREVIEW_FRONTEND_BASE_DOMAIN;
      delete process.env.PREVIEW_SUBDOMAIN_LABEL;

      expect(extractTenantSlugFromPreviewHostname('acmecorp.preview.sling.biz')).toBe('acmecorp');
      expect(extractTenantSlugFromPreviewHostname('BETA-12.preview.sling.biz')).toBe('beta-12');
    });

    it('still accepts legacy preview.<slug>.sling.biz', () => {
      delete process.env.PREVIEW_FRONTEND_BASE_DOMAIN;
      delete process.env.PREVIEW_SUBDOMAIN_LABEL;

      expect(extractTenantSlugFromPreviewHostname('preview.acmecorp.sling.biz')).toBe('acmecorp');
    });

    it('returns null when label or base mismatches', () => {
      expect(extractTenantSlugFromPreviewHostname('shop.acme.sling.biz')).toBe(null);
      expect(extractTenantSlugFromPreviewHostname('acme.preview.wrong.biz')).toBe(null);
    });

    it('respects custom base domain env', () => {
      process.env.PREVIEW_FRONTEND_BASE_DOMAIN = 'staging.example.com';

      expect(extractTenantSlugFromPreviewHostname('tenant1.preview.staging.example.com')).toBe(
        'tenant1',
      );
      expect(extractTenantSlugFromPreviewHostname('preview.tenant1.staging.example.com')).toBe(
        'tenant1',
      );
    });
  });
});
