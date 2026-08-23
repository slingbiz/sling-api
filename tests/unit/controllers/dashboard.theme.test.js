const httpMocks = require('node-mocks-http');
const httpStatus = require('http-status');
const {EventEmitter} = require('events');

jest.mock('../../../src/services/client.service', () => ({
  getInitConfig: jest.fn().mockResolvedValue({ home: { root: {} } }),
}));

jest.mock('../../../src/services/theme.service', () => ({
  getTheme: jest.fn().mockResolvedValue({
    theme: {
      palette: {
        primary: { main: '#ABCDEF', contrastText: '#fff' },
        secondary: { main: '#FEDCBA' },
      },
    },
    themeStyle: 'standard',
    themeMode: 'light',
    navStyle: 'h-default',
    layoutType: 'full-width',
  }),
}));

const dashboardController = require('../../../src/controllers/dashboard.controller');
const themeService = require('../../../src/services/theme.service');

const flush = () => new Promise((resolve) => setImmediate(resolve));

const mockRes = () => {
  const payloads = [];
  const res = httpMocks.createResponse({eventEmitter: EventEmitter});
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

describe('dashboard.initConfig tenant theme', () => {
  test('initConfig payload includes the tenant theme, not only the static JS file', async () => {
    const req = httpMocks.createRequest();
    req.clientId = 'tenant-a';
    const res = mockRes();
    const next = jest.fn();

    dashboardController.initConfig(req, res, next);
    await flush();
    if (next.mock.calls[0]?.[0]) {
      throw next.mock.calls[0][0];
    }

    expect(themeService.getTheme).toHaveBeenCalledWith('tenant-a');
    const body = res.payloads[0];
    expect(body.initConfigData.theme.palette.primary.main).toBe('#ABCDEF');
    expect(body.initConfigData.theme.palette.primary.main).not.toBe('#0A8FDC');
  });

  test('looks up theme by the authenticated clientId only', async () => {
    const req = httpMocks.createRequest();
    req.clientId = 'tenant-b';
    const res = mockRes();

    dashboardController.initConfig(req, res, jest.fn());
    await flush();

    expect(themeService.getTheme).toHaveBeenCalledWith('tenant-b');
    expect(res.statusCode).toBe(httpStatus.OK);
  });
});
