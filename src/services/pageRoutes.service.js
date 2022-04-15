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
          title: cond,
        },
        {
          page_template: cond,
        },
        {
          sample_string: cond,
        },
        {
          url_string: cond,
        },
      ],
    });
  }
  // Get all public
  const orArray = [{ ownership: 'public' }];

  // Or private for the client
  andArray.push({ ownership: 'private', client_id: clientId });

  // andArray.push({ $or: orArray });

  // Get widgets and total count
  console.log(andArray, '[andArrayandArrayandArray]');
  const pageRoutesRes = await db.collection('page_routes').find({ $and: andArray }).skip(skip).limit(size).toArray();
  const totalRes = await db.collection('page_routes').count({ $and: andArray });
  return { pageRoutes: pageRoutesRes, tc: totalRes };
};

const saveRoute = async ({ req, clientId }) => {
  console.log('saveRoute', req.body);
  const { name, keys, page_template: pageTemplate, url, sample_string: sampleString } = req.body;
  const db = getDb();
  let saveRes = {};
  try {
    const updObj = {
      ownership: 'private',
      title: name,
      keys,
      client_id: clientId,
      url_string: decodeURI(url),
      sample_string: sampleString,
      page_template: pageTemplate,
    };
    await db
      .collection('page_routes')
      .updateOne({ client_id: clientId, url_string: url }, { $set: { ...updObj } }, { upsert: true });

    saveRes = { status: true, msg: 'Route updated successfully' };
  } catch (e) {
    console.log(e.message, '[setInitConfig] Service');
    saveRes = { status: false, msg: e.message };
  }
  return saveRes;
};

module.exports = {
  getRoutes,
  saveRoute,
};
