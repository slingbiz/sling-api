const { ObjectId } = require('mongodb');

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
  const pageRoutesRes = await db
    .collection('page_routes')
    .find({ $and: andArray })
    .sort({ _id: -1 })
    .skip(skip)
    .limit(size)
    .toArray();
  const totalRes = await db.collection('page_routes').count({ $and: andArray });
  return { pageRoutes: pageRoutesRes, tc: totalRes };
};

const saveRoute = async ({ req, clientId }) => {
  const { _id, name, keys, page_template: pageTemplate, url, sample_string: sampleString } = req.body;
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

    if (_id) {
      await db
        .collection('page_routes')
        .updateOne({ client_id: clientId, _id: new ObjectId(_id) }, { $set: { ...updObj } }, { upsert: true });
    } else {
      await db.collection('page_routes').insertOne({ ...updObj });
    }

    saveRes = { status: true, msg: 'Route updated successfully' };
  } catch (e) {
    saveRes = { status: false, msg: e.message };
  }
  return saveRes;
};

// Delete route
const deleteRoute = async ({ req, clientId }) => {
  const _id = req.params.id;
  const db = getDb();
  let deleteRes = {};
  try {
    await db.collection('page_routes').deleteOne({ client_id: clientId, _id: new ObjectId(_id) });
    deleteRes = { status: true, msg: 'Page Route deleted successfully' };
  } catch (e) {
    deleteRes = { status: false, msg: e.message };
  }
  return deleteRes;
};

// Update Route
const updateRoute = async ({ req, clientId }) => {
  const { _id, name, keys, page_template: pageTemplate, url, sample_string: sampleString } = req.body;
  const db = getDb();
  let updateRes = {};
  try {
    const updObj = {
      ownership: 'private',
      client_id: clientId,
    };

    if (name) {
      updObj.title = name;
    }
    if (keys) {
      updObj.keys = keys;
    }
    if (pageTemplate) {
      updObj.page_template = pageTemplate;
    }
    if (url) {
      updObj.url_string = decodeURI(url);
    }
    if (sampleString) {
      updObj.sample_string = sampleString;
    }

    await db
      .collection('page_routes')
      .updateOne({ client_id: clientId, _id: new ObjectID(_id) }, { $set: { ...updObj } }, { upsert: true });

    updateRes = { status: true, msg: 'Route updated successfully' };
  } catch (e) {
    updateRes = { status: false, msg: e.message };
  }
  return updateRes;
};

module.exports = {
  getRoutes,
  saveRoute,
  deleteRoute,
  updateRoute,
};
