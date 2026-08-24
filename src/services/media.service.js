const { ObjectId } = require('mongodb');
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const { getDb } = require('../utils/mongoInit');

const toObjectId = (id) => {
  if (!id || !ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
  }
  return typeof id === 'string' ? new ObjectId(id) : id;
};

const sanitizeGcsName = (name) =>
  String(name || '')
    .replace(/[^a-zA-Z0-9.]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');

const buildGcsObjectName = (clientId, fileName) => {
  if (!clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientId is required');
  }
  return `${clientId}/${sanitizeGcsName(fileName)}`;
};

const objectNameFromPublicUrl = (url, bucketName) => {
  if (!url || !bucketName) return null;
  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  if (!String(url).startsWith(prefix)) return null;
  return decodeURIComponent(String(url).slice(prefix.length));
};

const getMedia = async ({ page = 0, size = 12, query, clientId, type }) => {
  const db = getDb();
  const skip = page * size;
  const andArray = [{ client_id: clientId }];
  if (type) {
    andArray.push({ type });
  }
  if (query) {
    const cond = {
      $regex: query,
      $options: 'i',
    };
    andArray.push({
      $or: [
        {
          title: cond,
        },
        {
          description: cond,
        },
      ],
    });
  }

  // Tenant-private gallery only. Do not OR in global ownership: 'public'.
  const mediaRes = await db.collection('media').find({ $and: andArray }).sort({ _id: -1 }).skip(skip).limit(size).toArray();
  const totalRes = await db.collection('media').count({ $and: andArray });
  const media = mediaRes.map((item) => ({
    ...item,
    upload_date: item.added_on || item.upload_date,
  }));
  return { media, tc: totalRes };
};

const getMediaConstants = async ({ page = 0, size = 12, query, clientId, type }) => {
  const db = getDb();
  const skip = page * size;
  const andArray = [];
  if (type) {
    andArray.push({ type });
  }
  if (query) {
    const cond = {
      $regex: query,
      $options: 'i',
    };
    andArray.push({
      $or: [
        {
          title: cond,
        },
        {
          description: cond,
        },
      ],
    });
  }
  // Get all public
  const orArray = [{ ownership: 'public' }];

  // Or private for the client
  orArray.push({ ownership: 'private', client_id: clientId });

  andArray.push({ $or: orArray });

  // TODO: Cache this response.
  // Get media and total count
  const mediaRes = await db.collection('media_constants').find({ $and: andArray }).skip(skip).limit(size).toArray();

  const imageUrls = {};
  if (mediaRes?.length) {
    let imageIds = [];
    mediaRes.forEach((v) => {
      const oids = [];
      v.images.forEach((w) => {
        oids.push(new ObjectId(w));
      });

      imageIds = [...imageIds, ...oids];
    });
    const imageUrlsRes = await db
      .collection('media')
      .find({ _id: { $in: imageIds } })
      .toArray();

    imageUrlsRes.forEach((v) => {
      imageUrls[v._id] = v.url;
    });
  }
  const totalRes = await db.collection('media_constants').count({ $and: andArray });
  return { media_constants: mediaRes, tc: totalRes, image_urls: imageUrls };
};

// save image to google cdn, and save the image url to the db with the client id
const saveImage = async (data, clientId) => {
  const db = getDb();
  // Save image_url, imgKey, name, altText
  const { name, altText, imgKey, image_url: imageUrl } = data;

  // Save the image to the db
  const image = {
    title: name,
    type: 'image',
    ownership: 'private',
    alt_text: altText,
    key: imgKey,
    url: imageUrl,
    added_on: new Date(),
    updated_on: new Date(),
    client_id: clientId,
  };
  const res = await db.collection('media').insertOne(image);
  return res;
};

const updateImage = async ({ id, title, alt_text: altText, clientId }) => {
  if (!clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientId is required');
  }
  const oid = toObjectId(id);
  const db = getDb();
  const $set = { updated_on: new Date() };
  if (title != null) {
    $set.title = title;
  }
  if (altText != null) {
    $set.alt_text = altText;
  }

  const result = await db.collection('media').updateOne({ _id: oid, client_id: clientId }, { $set }, { upsert: false });
  if (!result.matchedCount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
  }
  return db.collection('media').findOne({ _id: oid, client_id: clientId });
};

const deleteImage = async ({ id, clientId }) => {
  if (!clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientId is required');
  }
  const oid = toObjectId(id);
  const db = getDb();
  const existing = await db.collection('media').findOne({ _id: oid, client_id: clientId });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
  }
  await db.collection('media').deleteOne({ _id: oid, client_id: clientId });
  return existing;
};

module.exports = {
  getMedia,
  getMediaConstants,
  saveImage,
  updateImage,
  deleteImage,
  buildGcsObjectName,
  objectNameFromPublicUrl,
};
