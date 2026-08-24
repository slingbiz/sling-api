const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/routes/v1/widgets.route.js'), 'utf8');

describe('widget version routes', () => {
  test('history is open to workspace members; revert requires reviewWidgets', () => {
    expect(src).toMatch(/\/:widgetId\/versions/);
    expect(src).toMatch(/listWidgetVersions/);
    expect(src).toMatch(/getWidgetVersion/);
    expect(src).toMatch(/revertWidgetVersion/);
    expect(src).toMatch(/versions\/:versionId\/revert/);
    expect(src).toMatch(/auth\('reviewWidgets'\), validate\(widgetValidation.revertVersion\)/);
  });
});
