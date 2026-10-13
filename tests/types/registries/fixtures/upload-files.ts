import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;
const upload = app.plugin('upload').service('upload');

// The upload service reads the path, name, size and type of a file, so a hand-built file is
// accepted, e.g. in a seed script.
const file = {
  filepath: '/tmp/cover.png',
  originalFilename: 'cover.png',
  size: 1024,
  mimetype: 'image/png',
};
void upload.upload({ data: {}, files: [file] });
void upload.replace(1, { data: { fileInfo: {} }, file });
void upload.formatFileInfo({ filename: null, type: 'image/png', size: 1024 });

// @ts-expect-error The service reads the file from its path.
void upload.upload({ data: {}, files: [{ originalFilename: 'cover.png', size: 1024 }] });
