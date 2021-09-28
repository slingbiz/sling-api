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

  // or protected and bought subscriptions;
  // get all subscriptions
  // const subscriptionsRes = await db.collection('media_subscriptions').find({ client_id: clientId }).toArray();
  // const mediaSubscribed = subscriptionsRes?.[0]?.subscriptions;
  // if (mediaSubscribed?.length) {
  //   const oids = [];
  //   mediaSubscribed.forEach(function (item) {
  //     oids.push(new ObjectID(item));
  //   });
  //   orArray.push({ ownership: 'protected', _id: { $in: oids } });
  // }
  andArray.push({ $or: orArray });

  // TODO: Cache this response.
  // Get media and total count
  console.log(JSON.stringify(andArray), 'andArray', clientId);
  const mediaRes = await db.collection('media').find({ $and: andArray }).skip(skip).limit(size).toArray();
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

  // or protected and bought subscriptions;
  // get all subscriptions
  // const subscriptionsRes = await db.collection('media_subscriptions').find({ client_id: clientId }).toArray();
  // const mediaSubscribed = subscriptionsRes?.[0]?.subscriptions;
  // if (mediaSubscribed?.length) {
  //   const oids = [];
  //   mediaSubscribed.forEach(function (item) {
  //     oids.push(new ObjectID(item));
  //   });
  //   orArray.push({ ownership: 'protected', _id: { $in: oids } });
  // }
  andArray.push({ $or: orArray });

  // TODO: Cache this response.
  // Get media and total count
  console.log(JSON.stringify(andArray), 'andArray - media_constants', clientId);
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

module.exports = {
  getMedia,
  getMediaConstants,
};
