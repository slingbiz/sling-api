const {
  isValidTenantSlugFormat,
  slugifyTenantSource,
  slugifyEmailLocalPart,
  getTenantSlugCandidate,
  formatTenantSlugWithAttempt,
  shouldReplaceWithPreviewClientUrl,
} = require('./tenantSlug');

describe('tenantSlug', () => {
  describe('slugifyTenantSource', () => {
    it('hyphenates spaces and strips junk', () => {
      expect(slugifyTenantSource('Acme  Store!')).toBe('acme-store');
      expect(slugifyTenantSource('café Résumé')).toBe('cafe-resume');
    });

    it('returns empty string for unmappable input', () => {
      expect(slugifyTenantSource('!!!')).toBe('');
      expect(slugifyTenantSource('')).toBe('');
    });
  });

  describe('slugifyEmailLocalPart', () => {
    it('uses local part before @', () => {
      expect(slugifyEmailLocalPart('Jane.User@Example.com')).toBe('jane-user');
    });
  });

  describe('getTenantSlugCandidate', () => {
    it('prefers companyName over orgName and email', () => {
      expect(
        getTenantSlugCandidate({
          companyName: 'Alpha Co',
          orgName: 'Beta',
          email: 'charlie@delta.com',
        }),
      ).toBe('alpha-co');
    });

    it('falls back to email when names empty', () => {
      expect(getTenantSlugCandidate({ email: 'team@northwind.io' })).toBe('team');
    });

    it('falls back to tenant when nothing usable', () => {
      expect(getTenantSlugCandidate({ companyName: '!!!', orgName: '', email: '@@' })).toBe('tenant');
    });

    it('avoids reserved slugs via suffix', () => {
      expect(getTenantSlugCandidate({ companyName: 'WWW' })).toBe('www-site');
    });
  });

  describe('formatTenantSlugWithAttempt', () => {
    it('returns base at index 0', () => {
      expect(formatTenantSlugWithAttempt('acme', 0)).toBe('acme');
    });

    it('appends numeric suffix for collisions', () => {
      expect(formatTenantSlugWithAttempt('acme', 1)).toBe('acme-1');
      expect(formatTenantSlugWithAttempt('acme', 12)).toBe('acme-12');
    });
  });

  describe('isValidTenantSlugFormat', () => {
    it('accepts valid labels', () => {
      expect(isValidTenantSlugFormat('ab')).toBe(true);
      expect(isValidTenantSlugFormat('a')).toBe(true);
    });

    it('rejects bad labels', () => {
      expect(isValidTenantSlugFormat('-bad')).toBe(false);
      expect(isValidTenantSlugFormat('bad-')).toBe(false);
      expect(isValidTenantSlugFormat('')).toBe(false);
    });
  });

  describe('shouldReplaceWithPreviewClientUrl', () => {
    it('targets localhost and empty', () => {
      expect(shouldReplaceWithPreviewClientUrl('')).toBe(true);
      expect(shouldReplaceWithPreviewClientUrl('   ')).toBe(true);
      expect(shouldReplaceWithPreviewClientUrl('http://localhost:4087')).toBe(true);
      expect(shouldReplaceWithPreviewClientUrl('https://localhost/')).toBe(true);
      expect(shouldReplaceWithPreviewClientUrl('http://127.0.0.1:3000')).toBe(true);
    });

    it('keeps real hosts', () => {
      expect(shouldReplaceWithPreviewClientUrl('https://shop.example.com')).toBe(false);
      expect(shouldReplaceWithPreviewClientUrl('https://preview.acme.sling.biz')).toBe(false);
    });
  });
});
