const httpMocks = require('node-mocks-http');

jest.mock('../../../src/services/theme.service', () => ({
  getTheme: jest.fn().mockResolvedValue({ theme: { palette: {} } }),
  saveTheme: jest.fn().mockResolvedValue({ theme: { palette: { primary: { main: '#111111' } } } }),
}));

jest.mock('../../../src/services/audit.service', () => ({
  write: jest.fn().mockResolvedValue({ _id: 'a1' }),
  actorFromUser: (user) => {
    if (!user) return { actorUserId: undefined, actorName: undefined, actorEmail: undefined };
    const raw = user._id != null && user._id !== '' ? user._id : user.id;
    return {
      actorUserId: raw != null && raw !== '' ? String(raw) : undefined,
      actorName: user.name || undefined,
      actorEmail: user.email || undefined,
    };
  },
}));

const themeController = require('../../../src/controllers/theme.controller');
const auditService = require('../../../src/services/audit.service');

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('theme controller audit', () => {
  test('theme update writes theme.update for this clientId only', async () => {
    const req = httpMocks.createRequest({ body: { theme: { palette: { primary: { main: '#111111' } } } } });
    req.clientId = 'tenant-a';
    req.user = { _id: '507f1f77bcf86cd799439011', name: 'Ankur Pata', email: 'ankur@sling.biz' };
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
        actorUserId: '507f1f77bcf86cd799439011',
        action: 'theme.update',
        resourceType: 'theme',
        metadata: expect.objectContaining({
          actorName: 'Ankur Pata',
          actorEmail: 'ankur@sling.biz',
        }),
      })
    );
  });
});
