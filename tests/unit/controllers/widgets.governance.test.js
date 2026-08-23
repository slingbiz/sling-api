const httpMocks = require('node-mocks-http');
const { WidgetStatus } = require('../../../src/constants/appEnums');

jest.mock('../../../src/services', () => ({
  widgetsService: {
    getWidgets: jest.fn().mockResolvedValue({ widgets: [], tc: 0 }),
    createWidget: jest.fn().mockResolvedValue({ _id: 'w1', status: 'draft' }),
    submitWidgetForReview: jest.fn().mockResolvedValue({ _id: 'w1', status: 'pending_review' }),
    reviewWidget: jest.fn().mockResolvedValue({ _id: 'w1', status: 'approved' }),
    publishWidget: jest.fn().mockResolvedValue({ _id: 'w1', status: 'published' }),
  },
  widgetGenerateService: {
    generateWidget: jest.fn().mockResolvedValue({
      name: 'LoginForm',
      key: 'LoginForm',
      description: 'Login',
      icon: 'Widgets',
      type: 'widget',
      code: 'const PreviewComponent = () => null;',
    }),
  },
  themeService: {
    getTheme: jest.fn().mockResolvedValue({ theme: { palette: {} } }),
    saveTheme: jest.fn().mockResolvedValue({ theme: { palette: {} } }),
  },
  auditService: {
    write: jest.fn().mockResolvedValue({ _id: 'a1' }),
    list: jest.fn().mockResolvedValue({ events: [], tc: 0 }),
  },
}));

const widgetsController = require('../../../src/controllers/widgets.controller');
const { widgetsService, auditService } = require('../../../src/services');

const flush = () => new Promise((resolve) => setImmediate(resolve));

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

const run = async (handler, req) => {
  const res = sendOk();
  const next = jest.fn();
  handler(req, res, next);
  await flush();
  if (next.mock.calls[0]?.[0]) {
    throw next.mock.calls[0][0];
  }
  return res;
};

describe('widgets controller governance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getPublishedWidgets always forces status=published for this clientId', async () => {
    const req = httpMocks.createRequest({ body: { type: 'widget' } });
    req.clientId = 'tenant-a';
    await run(widgetsController.getPublishedWidgets, req);

    expect(widgetsService.getWidgets).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'tenant-a',
        status: WidgetStatus.PUBLISHED,
      })
    );
  });

  test('studio getWidgets forwards status and never drops clientId', async () => {
    const req = httpMocks.createRequest({ body: { type: 'widget', status: 'pending_review' } });
    req.clientId = 'tenant-a';
    await run(widgetsController.getWidgets, req);

    expect(widgetsService.getWidgets).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'tenant-a',
        status: 'pending_review',
      })
    );
  });

  test('generate, save, submit, approve, reject, publish write audit events', async () => {
    const generateReq = httpMocks.createRequest({ body: { prompt: 'Build a login form widget' } });
    generateReq.clientId = 'tenant-a';
    generateReq.user = { id: 'user-a' };
    await run(widgetsController.generateWidget, generateReq);
    expect(auditService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'widget.generate', clientId: 'tenant-a' }));
    expect(auditService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'widget.save', clientId: 'tenant-a' }));

    const saveReq = httpMocks.createRequest({ body: { name: 'X', key: 'X', description: 'X', type: 'widget', ownership: 'private' } });
    saveReq.clientId = 'tenant-a';
    saveReq.user = { id: 'user-a' };
    await run(widgetsController.createWidget, saveReq);
    expect(auditService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'widget.save', clientId: 'tenant-a' }));

    const submitReq = httpMocks.createRequest({ params: { widgetId: 'w1' } });
    submitReq.clientId = 'tenant-a';
    submitReq.user = { id: 'user-a' };
    await run(widgetsController.submitWidgetForReview, submitReq);
    expect(auditService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'widget.submit_review', clientId: 'tenant-a' }));

    const approveReq = httpMocks.createRequest({ params: { widgetId: 'w1' }, body: { action: 'approve' } });
    approveReq.clientId = 'tenant-a';
    approveReq.user = { id: 'user-a' };
    await run(widgetsController.reviewWidget, approveReq);
    expect(auditService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'widget.approve', clientId: 'tenant-a' }));

    const rejectReq = httpMocks.createRequest({ params: { widgetId: 'w1' }, body: { action: 'reject' } });
    rejectReq.clientId = 'tenant-a';
    rejectReq.user = { id: 'user-a' };
    await run(widgetsController.reviewWidget, rejectReq);
    expect(auditService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'widget.reject', clientId: 'tenant-a' }));

    const publishReq = httpMocks.createRequest({ params: { widgetId: 'w1' } });
    publishReq.clientId = 'tenant-a';
    publishReq.user = { id: 'user-a' };
    await run(widgetsController.publishWidget, publishReq);
    expect(auditService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'widget.publish', clientId: 'tenant-a' }));
  });
});
