const httpMocks = require('node-mocks-http');

jest.mock('../../../src/services/theme.service', () => ({
  getTheme: jest.fn().mockResolvedValue({ theme: { palette: {} } }),
  saveTheme: jest.fn().mockResolvedValue({ theme: { palette: { primary: { main: '#111111' } } } }),
}));

jest.mock('../../../src/services/audit.service', () => ({
  write: jest.fn().mockResolvedValue({ _id: 'a1' }),
}));

const themeController = require('../../../src/controllers/theme.controller');
const auditService = require('../../../src/services/audit.service');

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('theme controller audit', () => {
  test('theme update writes theme.update for this clientId only', async () => {
    const req = httpMocks.createRequest({ body: { theme: { palette: { primary: { main: '#111111' } } } } });
    req.clientId = 'tenant-a';
    req.user = { id: 'user-a' };
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
    const next = jest.fn();
    themeController.setTheme(req, res, next);
    await flush();
    if (next.mock.calls[0]?.[0]) {
      throw next.mock.calls[0][0];
    }

    expect(auditService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'tenant-a',
        actorUserId: 'user-a',
        action: 'theme.update',
        resourceType: 'theme',
      })
    );
  });
});
