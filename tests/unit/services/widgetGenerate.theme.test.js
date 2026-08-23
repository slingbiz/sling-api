const widgetGenerateService = require('../../../src/services/widgetGenerate.service');

describe('widgetGenerate.service theme prompts', () => {
  test('exposes buildThemeInstruction', () => {
    expect(typeof widgetGenerateService.buildThemeInstruction).toBe('function');
  });

  test('uses provided tenant theme and does not force Sling orange', () => {
    const { systemPrompt, userPrompt } = widgetGenerateService.buildThemeInstruction('login form with email', {
      palette: { primary: { main: '#123456' }, secondary: { main: '#654321' } },
    });

    expect(userPrompt).toContain('#123456');
    expect(userPrompt).toMatch(/use this tenant theme palette/i);
    expect(userPrompt).not.toMatch(/Use Sling orange \(#ff9800\) as the primary color/i);
    expect(systemPrompt).not.toMatch(/always use Sling orange/i);
    expect(systemPrompt).not.toMatch(/Brand primary color is #ff9800/i);
    expect(systemPrompt).not.toMatch(/Brand primary is #ff9800/i);
  });

  test('when themeConfig is missing, does not inject forced orange', () => {
    const { systemPrompt, userPrompt } = widgetGenerateService.buildThemeInstruction('newsletter signup');

    expect(userPrompt).toMatch(/provided theme palette if any|Material-UI defaults/i);
    expect(userPrompt).not.toContain('#ff9800');
    expect(systemPrompt).not.toContain('#ff9800');
  });
});
