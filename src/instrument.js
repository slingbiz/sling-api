// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require('@sentry/node');

const integrations = [];
// @sentry/profiling-node ships native binaries only for Node 16/18/20/22; Vercel may run newer
// Node versions where profiling fails or must be built from source — skip on serverless.
if (!process.env.VERCEL) {
  try {
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');
    integrations.push(nodeProfilingIntegration());
    Sentry.profiler.startProfiler();
    Sentry.startSpan({ name: 'My First Transaction' }, () => {});
    Sentry.profiler.stopProfiler();
  } catch {
    // profiling optional
  }
}

Sentry.init({
  dsn: 'https://ba7f2dbc8fc31c1357302f2a28d5c27c@o4508544815005696.ingest.de.sentry.io/4508544821100624',
  integrations,
  tracesSampleRate: 1.0,
});
