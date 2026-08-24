const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/routes/v1/media.route.js'), 'utf8');

describe('media routes', () => {
  test('update and delete sit next to saveImage and uploadImage, with auth', () => {
    expect(src).toMatch(/\/saveImage/);
    expect(src).toMatch(/\/uploadImage/);
    expect(src).toMatch(/\/updateImage/);
    expect(src).toMatch(/\/deleteImage/);
    expect(src).toMatch(/\.post\(auth\(\), mediaController\.updateImage\)\.patch\(auth\(\), mediaController\.updateImage\)/);
    expect(src).toMatch(/\.delete\(auth\(\), mediaController\.deleteImage\)/);
  });

  test('does not add constants CRUD', () => {
    expect(src).not.toMatch(/updateMediaConstant/);
    expect(src).not.toMatch(/saveMediaConstant/);
    expect(src).not.toMatch(/deleteMediaConstant/);
  });
});
