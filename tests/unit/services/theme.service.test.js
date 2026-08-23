const defaultConfig = require('../../../src/constants/initConfig');

const memory = {};

jest.mock('../../../src/models/themeConfig.model', () => ({
  findOne: jest.fn(async (query) => {
    if (!query || query.client_id == null) {
      throw new Error('theme lookup must filter by client_id');
    }
    return memory[query.client_id] || null;
  }),
  findOneAndUpdate: jest.fn(async (query, update) => {
    if (!query || query.client_id == null) {
      throw new Error('theme upsert must filter by client_id');
    }
    const prev = memory[query.client_id] || { client_id: query.client_id };
    const next = {
      ...prev,
      ...(update.$set || update),
      client_id: query.client_id,
    };
    memory[query.client_id] = next;
    return next;
  }),
}));

const themeService = require('../../../src/services/theme.service');

describe('theme.service', () => {
  beforeEach(() => {
    Object.keys(memory).forEach((key) => delete memory[key]);
    jest.clearAllMocks();
  });

  test('GET theme returns initConfig defaults when nothing is saved', async () => {
    const result = await themeService.getTheme('tenant-a');

    expect(result.theme.palette.primary.main).toBe(defaultConfig.theme.palette.primary.main);
    expect(result.theme.palette.secondary.main).toBe(defaultConfig.theme.palette.secondary.main);
    expect(result.theme.palette.background.paper).toBe(defaultConfig.theme.palette.background.paper);
    expect(result.theme.palette.sidebar.bgColor).toBe(defaultConfig.theme.palette.sidebar.bgColor);
    expect(result.themeStyle).toBe(defaultConfig.themeStyle);
    expect(result.themeMode).toBe(defaultConfig.themeMode);
  });

  test('PUT/POST saves palette for that clientId only', async () => {
    const saved = await themeService.saveTheme('tenant-a', {
      theme: {
        palette: {
          primary: { main: '#112233' },
          secondary: { main: '#445566' },
          background: { paper: '#ffffff', default: '#f4f7fe' },
          text: { primary: '#111111', secondary: '#222222' },
          sidebar: { bgColor: '#333333', textColor: '#aaaaaa' },
        },
      },
    });

    expect(saved.theme.palette.primary.main).toBe('#112233');
    expect(memory['tenant-a'].theme.palette.primary.main).toBe('#112233');
    expect(memory['tenant-b']).toBeUndefined();
  });

  test('GET after save returns saved values merged over defaults', async () => {
    await themeService.saveTheme('tenant-a', {
      theme: {
        palette: {
          primary: { main: '#abcdef' },
        },
      },
    });

    const result = await themeService.getTheme('tenant-a');

    expect(result.theme.palette.primary.main).toBe('#abcdef');
    expect(result.theme.palette.primary.contrastText).toBe(defaultConfig.theme.palette.primary.contrastText);
    expect(result.theme.palette.gray[500]).toBe(defaultConfig.theme.palette.gray[500]);
    expect(result.theme.typography.fontFamily).toBe(defaultConfig.theme.typography.fontFamily);
  });

  test('tenant isolation: client A cannot read or overwrite client B theme', async () => {
    await themeService.saveTheme('tenant-a', {
      theme: { palette: { primary: { main: '#aaaaaa' } } },
    });
    await themeService.saveTheme('tenant-b', {
      theme: { palette: { primary: { main: '#bbbbbb' } } },
    });

    const themeA = await themeService.getTheme('tenant-a');
    const themeB = await themeService.getTheme('tenant-b');

    expect(themeA.theme.palette.primary.main).toBe('#aaaaaa');
    expect(themeB.theme.palette.primary.main).toBe('#bbbbbb');

    await themeService.saveTheme('tenant-a', {
      theme: { palette: { primary: { main: '#cccccc' } } },
    });

    const themeBAfter = await themeService.getTheme('tenant-b');
    expect(themeBAfter.theme.palette.primary.main).toBe('#bbbbbb');
    expect(memory['tenant-b'].theme.palette.primary.main).toBe('#bbbbbb');
  });

  test('missing clientId is rejected', async () => {
    await expect(themeService.getTheme()).rejects.toThrow(/clientId/i);
    await expect(themeService.saveTheme(null, { theme: {} })).rejects.toThrow(/clientId/i);
  });

  test('invalid hex on color fields is rejected', async () => {
    await expect(
      themeService.saveTheme('tenant-a', {
        theme: { palette: { primary: { main: 'not-a-hex' } } },
      })
    ).rejects.toThrow(/hex|color|invalid/i);
  });

  test('unknown junk keys are ignored safely', async () => {
    const result = await themeService.saveTheme('tenant-a', {
      theme: {
        palette: { primary: { main: '#123456' } },
        __proto__: { polluted: true },
        exploit: 'drop-all',
      },
      notAThemeField: 'nope',
    });

    expect(result.theme.palette.primary.main).toBe('#123456');
    expect(result.theme.exploit).toBeUndefined();
    expect(result.notAThemeField).toBeUndefined();
    expect(memory['tenant-a'].exploit).toBeUndefined();
    expect(memory['tenant-a'].notAThemeField).toBeUndefined();
  });
});
