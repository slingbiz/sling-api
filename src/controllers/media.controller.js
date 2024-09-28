/* eslint-disable no-console */
const httpStatus = require('http-status');
const { Storage } = require('@google-cloud/storage');
const catchAsync = require('../utils/catchAsync');

const mediaService = require('../services/media.service');

// Initialize Google Cloud Storage only if credentials are set
let storage = null;
let bucket = null;

if (process.env.GCLOUD_PROJECT_ID && process.env.GCLOUD_CLIENT_EMAIL && process.env.GCLOUD_PRIVATE_KEY) {
  storage = new Storage({
    projectId: process.env.GCLOUD_PROJECT_ID,
    credentials: {
      client_email: process.env.GCLOUD_CLIENT_EMAIL,
      private_key: process.env.GCLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines in the private key
    },
  });
  bucket = storage.bucket('sling-studio');
} else {
  console.warn('Google Cloud credentials are not set, using local storage for file uploads.');
}

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const getMedia = catchAsync(async (req, res) => {
  const { query, page, size } = req.body;
  const { clientId } = req;

  const media = await mediaService.getMedia({ page, size, query, clientId });
  res.status(httpStatus.OK).send({ media });
});

const getMediaConstants = catchAsync(async (req, res) => {
  const { query, page, size } = req.body;
  const { clientId } = req;

  const mediaConstants = await mediaService.getMediaConstants({ page, size, query, clientId });
  res.status(httpStatus.OK).send({ media: mediaConstants });
});

const saveImage = catchAsync(async (req, res) => {
  const { clientId } = req;
  const image = await mediaService.saveImage(req.body, clientId);
  res.status(httpStatus.OK).send({ image });
});

const uploadImage = catchAsync(async (req, res) => {
  try {
    if (!bucket) {
      return res.status(500).send({ message: 'Google Cloud credentials are not set for uploading files to Storage.' });
    }
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // Extract the file name from the request
    const fileName = req.file.originalname || req.file.filename;

    if (!fileName) {
      throw new Error('A file name must be specified');
    }

    // Create a new blob in the bucket and upload the file
    const blob = bucket.file(
      fileName
        .replace(/[^a-zA-Z0-9.]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
    );

    const blobStream = blob.createWriteStream({
      resumable: false,
    });

    blobStream.on('error', (err) => {
      console.error('Blob stream error', err);
      return res.status(500).send({ message: 'Error uploading to Google Cloud Storage.' });
    });

    blobStream.on('finish', async () => {
      // Public URL for accessing the file via HTTP
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      res.status(200).send({ imageUrl: publicUrl });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).send({ message: 'Error uploading file.', error });
  }
});

module.exports = {
  ping,
  getMedia,
  getMediaConstants,
  saveImage,
  uploadImage,
};
