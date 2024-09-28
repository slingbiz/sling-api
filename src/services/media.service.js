const { ObjectID } = require('mongodb');

const { getDb } = require('../utils/mongoInit');

const getMedia = async ({ page = 0, size = 12, query, clientId, type }) => {
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
  const mediaRes = await db.collection('media').find({ $and: andArray }).sort({ _id: -1 }).skip(skip).limit(size).toArray();
  const totalRes = await db.collection('media').count({ $and: andArray });
  return { media: mediaRes, tc: totalRes };
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
        oids.push(new ObjectID(w));
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

module.exports = {
  getMedia,
  getMediaConstants,
  saveImage,
};
