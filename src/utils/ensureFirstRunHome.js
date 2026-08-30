const DEFAULT_HOME_CELL = {
  key: 'DefaultSlingHomePage',
  type: 'componentBlock',
  payload: { muiWidths: { sm: 12, md: 12, lg: 12 } },
};

const defaultHomeTemplate = () => ({
  meta: { title: 'Home', description: 'Your first page' },
  root: {
    header: { rows: [] },
    body: {
      rows: [{ cells: [DEFAULT_HOME_CELL], config: { wrapper: 'DefaultContent' } }],
    },
  },
});

const homeBodyRowCount = (home) => (home && home.root && home.root.body && home.root.body.rows
  ? home.root.body.rows.length
  : 0);

const ensureFirstRunHome = async (db, clientId) => {
  const now = new Date();
  const existingHome = await db.collection('page_routes').findOne({
    client_id: clientId,
    url_string: '/',
  });
  if (!existingHome) {
    await db.collection('page_routes').insertOne({
      url_string: '/',
      regex_pattern: '',
      type: 'simple',
      title: 'Home',
      ownership: 'private',
      client_id: clientId,
      keys: [],
      page_template: 'home',
      is_active: true,
      page_type_advanced: false,
      added_on: now,
      updated_on: now,
      version: '1.3.0',
    });
  }

  let layout = await db.collection('layout_config').findOne({
    client_id: clientId,
    ownership: 'private',
  });
  if (!layout) {
    const publicLayout = await db
      .collection('layout_config')
      .find({ ownership: 'public' })
      .project({ _id: 0 })
      .next();
    if (publicLayout) {
      await db.collection('layout_config').insertOne({
        ...publicLayout,
        client_id: clientId,
        ownership: 'private',
        added_on: now,
        updated_on: now,
      });
      layout = await db.collection('layout_config').findOne({
        client_id: clientId,
        ownership: 'private',
      });
    }
  }

  if (!layout) {
    await db.collection('layout_config').insertOne({
      client_id: clientId,
      ownership: 'private',
      config: { home: defaultHomeTemplate() },
      added_on: now,
      updated_on: now,
    });
    return;
  }

  const home = layout.config && layout.config.home;
  if (!home) {
    await db.collection('layout_config').updateOne(
      { _id: layout._id },
      { $set: { 'config.home': defaultHomeTemplate(), updated_on: now } },
    );
    return;
  }

  if (homeBodyRowCount(home) === 0) {
    await db.collection('layout_config').updateOne(
      { _id: layout._id },
      {
        $set: {
          'config.home.root.body': defaultHomeTemplate().root.body,
          updated_on: now,
        },
      },
    );
  }
};

module.exports = {
  ensureFirstRunHome,
};
