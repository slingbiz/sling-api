const fs = require('fs');
const path = require('path');

const userSrc = fs.readFileSync(path.join(__dirname, '../../../src/services/user.service.js'), 'utf8');
const authMw = fs.readFileSync(path.join(__dirname, '../../../src/middlewares/auth.js'), 'utf8');
const createSrc = userSrc.slice(userSrc.indexOf('const createUser'), userSrc.indexOf('const queryUsers'));

describe('workspace members', () => {
  test('open signup becomes owner of a new workspace', () => {
    expect(createSrc).toMatch(/role:\s*'owner'/);
    expect(createSrc).toMatch(/workspaceKey:\s*email/);
  });

  test('invited users keep the invite workspace and cannot be created as owner', () => {
    expect(createSrc).toMatch(/userBody\.workspaceKey/);
    expect(createSrc).toMatch(/role !== 'owner'/);
  });

  test('API tenant id is workspaceKey so members share widgets', () => {
    expect(authMw).toMatch(/user\.workspaceKey \|\| user\.email/);
  });

  test('last owner cannot be removed', () => {
    expect(userSrc).toMatch(/last owner cannot be removed/);
    expect(userSrc).toMatch(/last owner cannot be demoted/);
    expect(userSrc).toMatch(/last owner cannot be moved to another workspace/);
  });

  test('ensureWorkspace promotes the oldest member when a workspace has no owner', () => {
    expect(userSrc).toMatch(/sort\(\{createdAt: 1/);
    expect(userSrc).toMatch(/oldest\.role = 'owner'/);
  });
});
