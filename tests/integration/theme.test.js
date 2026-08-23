const request = require('supertest');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const config = require('../../src/config/config');
const setupTestDB = require('../utils/setupTestDB');
const { tokenService } = require('../../src/services');
const { tokenTypes } = require('../../src/config/tokens');
const { userOne, userTwo, insertUsers } = require('../fixtures/user.fixture');
const { userOneAccessToken } = require('../fixtures/token.fixture');
const defaultConfig = require('../../src/constants/initConfig');

setupTestDB();

const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
const userTwoAccessToken = tokenService.generateToken(userTwo._id, accessTokenExpires, tokenTypes.ACCESS);

const palettePayload = {
  theme: {
    palette: {
      primary: { main: '#112233', contrastText: '#ffffff' },
      secondary: { main: '#445566' },
      background: { paper: '#ffffff', default: '#f4f7fe' },
      text: { primary: '#111111', secondary: '#222222' },
      sidebar: { bgColor: '#333333', textColor: '#aaaaaa' },
    },
  },
};

describe('Theme routes', () => {
  describe('GET /v1/theme', () => {
    test('should reject unauthenticated requests', async () => {
      await request(app).get('/v1/theme').expect(httpStatus.UNAUTHORIZED);
    });

    test('should return initConfig defaults when nothing is saved', async () => {
      await insertUsers([userOne]);

      const res = await request(app)
        .get('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.theme.palette.primary.main).toBe(defaultConfig.theme.palette.primary.main);
      expect(res.body.theme.palette.secondary.main).toBe(defaultConfig.theme.palette.secondary.main);
      expect(res.body.theme.palette.background.paper).toBe(defaultConfig.theme.palette.background.paper);
      expect(res.body.theme.palette.sidebar.bgColor).toBe(defaultConfig.theme.palette.sidebar.bgColor);
    });
  });

  describe('PUT /v1/theme', () => {
    test('should reject unauthenticated requests', async () => {
      await request(app).put('/v1/theme').send(palettePayload).expect(httpStatus.UNAUTHORIZED);
    });

    test('should save palette for that clientId and return it merged over defaults', async () => {
      await insertUsers([userOne]);

      const saveRes = await request(app)
        .put('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(palettePayload)
        .expect(httpStatus.OK);

      expect(saveRes.body.theme.palette.primary.main).toBe('#112233');
      expect(saveRes.body.theme.palette.gray[500]).toBe(defaultConfig.theme.palette.gray[500]);

      const getRes = await request(app)
        .get('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(getRes.body.theme.palette.primary.main).toBe('#112233');
      expect(getRes.body.theme.palette.secondary.main).toBe('#445566');
      expect(getRes.body.theme.palette.sidebar.bgColor).toBe('#333333');
    });

    test('should reject invalid hex colors', async () => {
      await insertUsers([userOne]);

      await request(app)
        .put('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ theme: { palette: { primary: { main: 'not-a-hex' } } } })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should ignore unknown junk keys', async () => {
      await insertUsers([userOne]);

      const res = await request(app)
        .put('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({
          theme: { palette: { primary: { main: '#123456' } }, exploit: 'nope' },
          notAThemeField: 'drop-me',
        })
        .expect(httpStatus.OK);

      expect(res.body.theme.palette.primary.main).toBe('#123456');
      expect(res.body.theme.exploit).toBeUndefined();
      expect(res.body.notAThemeField).toBeUndefined();
    });
  });

  describe('tenant isolation', () => {
    test('client A cannot read or overwrite client B theme', async () => {
      await insertUsers([userOne, userTwo]);

      await request(app)
        .put('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ theme: { palette: { primary: { main: '#aaaaaa' } } } })
        .expect(httpStatus.OK);

      await request(app)
        .put('/v1/theme')
        .set('Authorization', `Bearer ${userTwoAccessToken}`)
        .send({ theme: { palette: { primary: { main: '#bbbbbb' } } } })
        .expect(httpStatus.OK);

      const a = await request(app)
        .get('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);
      const b = await request(app)
        .get('/v1/theme')
        .set('Authorization', `Bearer ${userTwoAccessToken}`)
        .expect(httpStatus.OK);

      expect(a.body.theme.palette.primary.main).toBe('#aaaaaa');
      expect(b.body.theme.palette.primary.main).toBe('#bbbbbb');

      await request(app)
        .put('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ theme: { palette: { primary: { main: '#cccccc' } } } })
        .expect(httpStatus.OK);

      const bAfter = await request(app)
        .get('/v1/theme')
        .set('Authorization', `Bearer ${userTwoAccessToken}`)
        .expect(httpStatus.OK);

      expect(bAfter.body.theme.palette.primary.main).toBe('#bbbbbb');
    });
  });

  describe('GET /v1/dashboard/initConfig', () => {
    test('includes the saved tenant theme instead of only the static JS file', async () => {
      await insertUsers([userOne]);

      await request(app)
        .put('/v1/theme')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ theme: { palette: { primary: { main: '#abcdef' } } } })
        .expect(httpStatus.OK);

      const res = await request(app)
        .get('/v1/dashboard/initConfig')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.initConfigData.theme.palette.primary.main).toBe('#abcdef');
    });
  });
});
