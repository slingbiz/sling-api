const DOCS_URL = 'https://sling.biz/documentation';
const HOSTED_STUDIO_URL = 'https://studio.sling.biz';

const isLocalHost = (host) => /localhost|127\.0\.0\.1/i.test(String(host || ''));

const rootPayload = (req) => {
  const host = req.get ? req.get('host') : req.headers && req.headers.host;
  const local = isLocalHost(host);
  return {
    name: 'Sling CMS',
    service: 'api',
    ok: true,
    docs: DOCS_URL,
    studio: local ? 'http://localhost:2021' : HOSTED_STUDIO_URL,
    ...(local ? { storefront: 'http://localhost:4087' } : {}),
  };
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');

const rootHtml = (payload) => {
  const studio = escapeHtml(payload.studio);
  const docs = escapeHtml(payload.docs);
  const storefrontLink = payload.storefront
    ? `<a class="btn secondary" href="${escapeHtml(payload.storefront)}">Open the storefront</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sling CMS API</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Open Sans", "Helvetica Neue", Arial, sans-serif;
      background: #fff8f0;
      color: #163a5f;
    }
    main {
      width: min(560px, calc(100vw - 48px));
      background: #fff;
      border: 1px solid #f0e4d4;
      border-radius: 16px;
      padding: 40px 36px 32px;
    }
    .brand {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #ff9800;
      margin: 0 0 16px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 28px;
      line-height: 1.2;
    }
    p {
      margin: 0 0 28px;
      font-size: 15px;
      line-height: 1.5;
      color: #4a5d73;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    a.btn {
      display: inline-block;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      padding: 10px 18px;
    }
    a.btn.primary { background: #ff9800; color: #fff; }
    a.btn.secondary { background: #fff; color: #ff9800; border: 1px solid #ff9800; }
  </style>
</head>
<body>
  <main>
    <p class="brand">sling.biz</p>
    <h1>Sling CMS API is running</h1>
    <p>This is the backend. Studio and the storefront talk to it. There is no dashboard here.</p>
    <div class="actions">
      <a class="btn primary" href="${studio}">Open Studio</a>
      ${storefrontLink}
      <a class="btn secondary" href="${docs}">Documentation</a>
    </div>
  </main>
</body>
</html>`;
};

const sendApiRoot = (req, res) => {
  const payload = rootPayload(req);
  const accept = String((req.get && req.get('accept')) || req.headers.accept || '');
  if (accept.includes('text/html')) {
    res.status(200).type('html').send(rootHtml(payload));
    return;
  }
  res.status(200).json(payload);
};

module.exports = {
  isLocalHost,
  rootPayload,
  rootHtml,
  sendApiRoot,
};
