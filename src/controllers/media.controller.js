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

const imageIdFromReq = (req) => {
  const body = req.body || {};
  return req.params.id || body._id || body.id;
};

const updateFieldsFromReq = (req) => {
  const body = req.body || {};
  const nested = body.update || {};
  return {
    title: body.title ?? body.name ?? nested.title ?? nested.name,
    alt_text: body.alt_text ?? body.altText ?? nested.alt_text ?? nested.altText,
  };
};

const updateImage = catchAsync(async (req, res) => {
  const { clientId } = req;
  const { title, alt_text: altText } = updateFieldsFromReq(req);
  const image = await mediaService.updateImage({
    id: imageIdFromReq(req),
    title,
    alt_text: altText,
    clientId,
  });
  res.status(httpStatus.OK).send({ image });
});

const deleteGcsObjectBestEffort = async (url) => {
  if (!bucket || !url) return;
  const objectName = mediaService.objectNameFromPublicUrl(url, bucket.name);
  if (!objectName) return;
  try {
    await bucket.file(objectName).delete({ ignoreNotFound: true });
  } catch (err) {
    console.error('GCS delete failed', err);
  }
};

const deleteImage = catchAsync(async (req, res) => {
  const { clientId } = req;
  const image = await mediaService.deleteImage({ id: imageIdFromReq(req), clientId });
  await deleteGcsObjectBestEffort(image && image.url);
  res.status(httpStatus.OK).send({ status: true });
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

    // Prefix with clientId so two tenants cannot overwrite the same filename.
    const objectName = mediaService.buildGcsObjectName(req.clientId, fileName);
    const blob = bucket.file(objectName);

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
  updateImage,
  deleteImage,
  uploadImage,
};
