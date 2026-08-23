const httpMocks = require('node-mocks-http');

jest.mock('../../../src/services/frontend.service', () => ({
  getMatchingRoute: jest.fn().mockResolvedValue({ page_template: 'home' }),
  getLayout: jest.fn().mockResolvedValue({ home: {} }),
  getSSRApiRes: jest.fn().mockResolvedValue({}),
  getRouteConstants: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../src/services/theme.service', () => ({
  getTheme: jest.fn().mockResolvedValue({
    theme: {
      palette: {
        primary: { main: '#ABCDEF', contrastText: '#fff' },
      },
    },
    themeStyle: 'standard',
    themeMode: 'light',
    navStyle: 'h-default',
    layoutType: 'full-width',
  }),
}));

const frontendController = require('../../../src/controllers/frontend.controller');
const themeService = require('../../../src/services/theme.service');
const { GLOBAL_SLING_HANDLER } = require('../../../src/constants/common');

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('frontend.getInitProps tenant theme', () => {
  const sendOk = () => {
    const payloads = [];
    const res = httpMocks.createResponse();
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.send = (body) => {
      payloads.push(body);
      return res;
    };
    res.payloads = payloads;
    return res;
  };

  test('storefront initConfig includes the tenant theme, not only the static JS file', async () => {
    const req = httpMocks.createRequest({
      body: { pathname: GLOBAL_SLING_HANDLER[0], query: {}, asPath: '/' },
    });
    req.clientId = 'tenant-a';
    const res = sendOk();

    const next = jest.fn();
    frontendController.getInitProps(req, res, next);
    await flush();
    if (next.mock.calls[0]?.[0]) {
      throw next.mock.calls[0][0];
    }

    expect(themeService.getTheme).toHaveBeenCalledWith('tenant-a');
    const body = res.payloads[0];
    expect(body.initConfig.theme.palette.primary.main).toBe('#ABCDEF');
    expect(body.initConfig.theme.palette.primary.main).not.toBe('#0A8FDC');
  });

  test('early-return paths still include the tenant theme', async () => {
    const req = httpMocks.createRequest({
      body: { pathname: '/not-sling', query: {}, asPath: '/not-sling' },
    });
    req.clientId = 'tenant-a';
    const res = sendOk();

    const next = jest.fn();
    frontendController.getInitProps(req, res, next);
    await flush();
    if (next.mock.calls[0]?.[0]) {
      throw next.mock.calls[0][0];
    }

    expect(themeService.getTheme).toHaveBeenCalledWith('tenant-a');
    const body = res.payloads[0];
    expect(body.initConfig.theme.palette.primary.main).toBe('#ABCDEF');
  });
});
