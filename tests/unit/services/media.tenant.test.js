const { ObjectId } = require('mongodb');
const httpStatus = require('http-status');

const mockStore = [];

const mockMatches = (doc, query = {}) => {
  if (!query || Object.keys(query).length === 0) return true;
  if (query.$and) {
    return query.$and.every((clause) => mockMatches(doc, clause));
  }
  if (query.$or) {
    return query.$or.some((clause) => mockMatches(doc, clause));
  }
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && value.$in) {
      return value.$in.some((item) => String(doc[key]) === String(item));
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && value.$regex) {
      return new RegExp(value.$regex, value.$options || '').test(String(doc[key] || ''));
    }
    return String(doc[key]) === String(value);
  });
};

const mockMediaCollection = {
  find: jest.fn((query) => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          toArray: async () => mockStore.filter((doc) => mockMatches(doc, query)),
        }),
      }),
    }),
    toArray: async () => mockStore.filter((doc) => mockMatches(doc, query)),
  })),
  count: jest.fn(async (query) => mockStore.filter((doc) => mockMatches(doc, query)).length),
  insertOne: jest.fn(async (doc) => {
    const row = { _id: doc._id || new ObjectId(), ...doc };
    mockStore.push(row);
    return { insertedId: row._id, acknowledged: true };
  }),
  updateOne: jest.fn(async (query, update, options = {}) => {
    if (options.upsert) {
      throw new Error('update must not upsert');
    }
    const idx = mockStore.findIndex((doc) => mockMatches(doc, query));
    if (idx < 0) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    Object.assign(mockStore[idx], update.$set || {});
    return { matchedCount: 1, modifiedCount: 1 };
  }),
  findOne: jest.fn(async (query) => mockStore.find((doc) => mockMatches(doc, query)) || null),
  deleteOne: jest.fn(async (query) => {
    const idx = mockStore.findIndex((doc) => mockMatches(doc, query));
    if (idx < 0) return { deletedCount: 0 };
    mockStore.splice(idx, 1);
    return { deletedCount: 1 };
  }),
};

jest.mock('../../../src/utils/mongoInit', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn((name) => {
      if (name !== 'media') {
        throw new Error(`unexpected collection ${name}`);
      }
      return mockMediaCollection;
    }),
  })),
}));

const mediaService = require('../../../src/services/media.service');

const tenantA = 'tenant-a';
const tenantB = 'tenant-b';
const imageAId = new ObjectId();
const imageBId = new ObjectId();
const publicId = new ObjectId();

beforeEach(() => {
  mockStore.length = 0;
  mockStore.push(
    {
      _id: imageAId,
      client_id: tenantA,
      ownership: 'private',
      title: 'A private',
      alt_text: 'a',
      url: 'https://storage.googleapis.com/sling-studio/tenant-a/a.jpg',
      added_on: new Date('2026-01-01'),
    },
    {
      _id: imageBId,
      client_id: tenantB,
      ownership: 'private',
      title: 'B private',
      alt_text: 'b',
      url: 'https://storage.googleapis.com/sling-studio/tenant-b/b.jpg',
      added_on: new Date('2026-02-01'),
    },
    {
      _id: publicId,
      client_id: 'default',
      ownership: 'public',
      title: 'Global picsum',
      alt_text: 'public',
      url: 'https://picsum.photos/200/300',
    }
  );
  jest.clearAllMocks();
});

describe('media tenant isolation', () => {
  test('getMedia returns only this workspace client_id', async () => {
    const { media, tc } = await mediaService.getMedia({ clientId: tenantA });
    expect(tc).toBe(1);
    expect(media).toHaveLength(1);
    expect(media[0]._id).toEqual(imageAId);
    expect(media[0].client_id).toBe(tenantA);
  });

  test('getMedia does not return other client_id or global public', async () => {
    const { media } = await mediaService.getMedia({ clientId: tenantA });
    const ids = media.map((item) => String(item._id));
    expect(ids).not.toContain(String(imageBId));
    expect(ids).not.toContain(String(publicId));
    expect(media.every((item) => item.ownership !== 'public')).toBe(true);
  });

  test('getMedia exposes added_on as upload_date for Studio', async () => {
    const { media } = await mediaService.getMedia({ clientId: tenantA });
    expect(media[0].added_on).toEqual(new Date('2026-01-01'));
    expect(media[0].upload_date).toEqual(new Date('2026-01-01'));
  });

  test('update changes title/alt_text and does not insert', async () => {
    const before = mockStore.length;
    const updated = await mediaService.updateImage({
      id: String(imageAId),
      title: 'Renamed',
      alt_text: 'new alt',
      clientId: tenantA,
    });
    expect(mockStore).toHaveLength(before);
    expect(mockMediaCollection.insertOne).not.toHaveBeenCalled();
    expect(updated.title).toBe('Renamed');
    expect(updated.alt_text).toBe('new alt');
    expect(String(mockStore.find((doc) => String(doc._id) === String(imageAId)).title)).toBe('Renamed');
  });

  test('update rejects another tenant id without inserting', async () => {
    const before = mockStore.length;
    await expect(
      mediaService.updateImage({
        id: String(imageBId),
        title: 'Hijack',
        clientId: tenantA,
      })
    ).rejects.toMatchObject({ statusCode: httpStatus.NOT_FOUND });
    expect(mockStore).toHaveLength(before);
    expect(mockStore.find((doc) => String(doc._id) === String(imageBId)).title).toBe('B private');
    expect(mockMediaCollection.insertOne).not.toHaveBeenCalled();
  });

  test('delete removes this tenant image', async () => {
    const deleted = await mediaService.deleteImage({ id: String(imageAId), clientId: tenantA });
    expect(deleted._id).toEqual(imageAId);
    expect(mockStore.find((doc) => String(doc._id) === String(imageAId))).toBeUndefined();
  });

  test('delete 404 for other tenant and leaves their row', async () => {
    await expect(mediaService.deleteImage({ id: String(imageBId), clientId: tenantA })).rejects.toMatchObject({
      statusCode: httpStatus.NOT_FOUND,
    });
    expect(mockStore.find((doc) => String(doc._id) === String(imageBId))).toBeTruthy();
  });
});

describe('gcs object names', () => {
  test('prefix object names with clientId', () => {
    expect(mediaService.buildGcsObjectName('tenant-a', 'Hero Shot.jpg')).toBe('tenant-a/Hero_Shot.jpg');
    expect(mediaService.buildGcsObjectName('tenant-b', 'Hero Shot.jpg')).toBe('tenant-b/Hero_Shot.jpg');
  });

  test('public URL pattern still maps back to the object', () => {
    const name = mediaService.buildGcsObjectName('tenant-a', 'logo.png');
    const url = `https://storage.googleapis.com/sling-studio/${name}`;
    expect(mediaService.objectNameFromPublicUrl(url, 'sling-studio')).toBe('tenant-a/logo.png');
  });
});
