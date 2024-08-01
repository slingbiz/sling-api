const { MongoClient } = require('mongodb');
const fs = require('fs');

async function exportData() {
  const uri = 'mongodb://localhost:27017'; // Update with your MongoDB connection string if different
  const dbName = 'sling'; // Replace with your database name

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    let initScriptContent = '';

    for (const collection of collections) {
      const collectionName = collection.name;
      const documents = await db.collection(collectionName).find({ ownership: 'public' }).toArray();

      if (documents.length > 0) {
        for (const doc of documents) {
          delete doc._id; // Remove the _id field to avoid conflicts
          const jsonDoc = JSON.stringify(doc);
          initScriptContent += `db.${collectionName}.insert(${jsonDoc});\n`;
        }
      }
    }

    fs.writeFileSync('init_data.js', initScriptContent);
    console.log('Initialization script created.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

exportData();
