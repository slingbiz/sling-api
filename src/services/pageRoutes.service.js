const { ObjectID } = require('mongodb');

const { getDb } = require('../utils/mongoInit');

const getRoutes = async ({ page = 0, size = 10, query, clientId, type }) => {
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
          name: cond,
        },
        {
          description: cond,
        },
        {
          sku: cond,
        },
      ],
    });
  }
  // Get all public
  const orArray = [{ ownership: 'public' }];

  // Or private for the client
  orArray.push({ ownership: 'private', client_id: clientId });

  andArray.push({ $or: orArray });

  // Get widgets and total count
  const pageRoutesRes = await db.collection('page_routes').find({ $and: andArray }).skip(skip).limit(size).toArray();
  const totalRes = await db.collection('page_routes').count({ $and: andArray });
  return { pageRoutes: pageRoutesRes, tc: totalRes };
};

module.exports = {
  getRoutes,
};
