'use strict';

const busboy = require('busboy');
const crypto = require('crypto');
const path = require('path');
const sharp = require('sharp');
const { Transform } = require('stream');
const { extension } = require('mime-types');

const _ = require('lodash');
const { ApplicationError } = require('@strapi/utils').errors;
const {
  mapAsync,
  nameToSlug,
  file: { bytesToKbytes },
} = require('@strapi/utils');
const { getService } = require('../utils');
const { ACTIONS, FILE_MODEL_UID } = require('../constants');
const validateUploadBody = require('./validation/admin/upload');
const { findEntityAndCheckPermissions } = require('./utils/find-entity-and-check-permissions');

module.exports = {
  async updateFileInfo(ctx) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body },
    } = ctx;

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    const data = await validateUploadBody(body);
    const file = await uploadService.updateFileInfo(id, data.fileInfo, { user });

    ctx.body = await pm.sanitizeOutput(file, { action: ACTIONS.read });
  },

  async replaceFile(ctx) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    if (Array.isArray(files)) {
      throw new ApplicationError('Cannot replace a file with multiple ones');
    }

    const data = await validateUploadBody(body);
    const replacedFile = await uploadService.replace(id, { data, file: files }, { user });

    // Sign file urls for private providers
    const signedFile = await getService('file').signFileUrls(replacedFile);

    ctx.body = await pm.sanitizeOutput(signedFile, { action: ACTIONS.read });
  },

  async uploadFiles(ctx) {
    const {
      state: { userAbility, user },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService('upload');
    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const data = await validateUploadBody(body);
    const uploadedFiles = await uploadService.upload({ data, files }, { user });

    // Sign file urls for private providers
    const signedFiles = await mapAsync(uploadedFiles, getService('file').signFileUrls);

    ctx.body = await pm.sanitizeOutput(signedFiles, { action: ACTIONS.read });
  },

  async uploadV2(ctx) {
    const {
      state: { userAbility, user },
    } = ctx;

    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    /*

    1. for each file
      - validate allowed mimetype
      - validate allowed size

      - create a transformation & upload stream for each file
      - pipe the file to the transformation
      - pipe the transformation to the upload stream

      - push in an array the metadatas of the file

    2. store metadatas in a database
      - read the fileInfo from the request
      - combine the fileInfo with the metadatas
      - store in the database

    */

    const imageService = getService('image-manipulation-v2');
    const fileService = getService('file');

    const isValidFilename = (filename) => {
      return true;
    };

    const randomSuffix = () => crypto.randomBytes(5).toString('hex');

    const generateFileName = (name) => {
      const baseName = nameToSlug(name, { separator: '_', lowercase: false });

      return `${baseName}_${randomSuffix()}`;
    };

    const processImage = async (file) => {
      const metas = await file.getStream().metadata();

      file.format = metas.format;
      file.size = bytesToKbytes(metas.size);
      file.sizeInBytes = metas.size;
      file.width = metas.width;
      file.height = metas.height;

      if (imageService.isProcessable(file)) {
        if (imageService.isOptimizable(file)) {
          imageService.optimize(file);
        }

        // For performance reasons, all uploads are wrapped in a single Promise.all
        const uploadThumbnail = async (thumbnailFile) => {
          await getService('provider').upload(thumbnailFile);
          _.set(file, 'formats.thumbnail', thumbnailFile);
        };

        // Generate thumbnail and responsive formats
        const uploadResponsiveFormat = async (format) => {
          const { key, file } = format;
          await getService('provider').upload(file);
          _.set(file, ['formats', key], file);
        };

        // Generate & Upload thumbnail and responsive formats
        if (await imageService.isResizable(file)) {
          const thumbnailFile = await imageService.generateThumbnail(file);
          if (thumbnailFile) {
            await uploadThumbnail(thumbnailFile);
          }
          const formats = await imageService.generateResponsiveFormats(file);
          if (Array.isArray(formats) && formats.length > 0) {
            for (const format of formats) {
              // eslint-disable-next-line no-continue
              if (!format) continue;
              await uploadResponsiveFormat(format);
            }
          }
        }
        // Wait for all uploads to finish
        await getService('provider').upload(file);
      } else {
        await getService('provider').upload(file);
      }

      return file;
    };

    const processFile = async (file) => {
      let size = 0;
      const sizer = new Transform({
        transform(chunk, encoding, callback) {
          size += chunk.length;
          this.push(chunk);
          callback();
        },
      });

      const pipeline = file.getStream().pipe(sizer);

      file.getStream = () => pipeline;

      console.log(size);

      await getService('provider').upload(file);

      return Object.assign(file, {
        size: bytesToKbytes(size),
        sizeInBytes: size,
      });
    };

    const promises = [];
    const data = {};

    const onFile = async (_, fileStream, info) => {
      const { filename, mimeType } = info;

      // validate filename
      if (!isValidFilename(filename)) {
        throw new ApplicationError('File name contains invalid characters');
      }

      let ext = path.extname(filename);
      if (!ext) {
        ext = `.${extension(mimeType)}`;
      }

      const usedName = filename.normalize();
      const basename = path.basename(usedName, ext);

      if (!isValidFilename(usedName)) {
        throw new ApplicationError('File name contains invalid characters');
      }

      const file = {
        name: usedName,
        alternativeText: null,
        caption: null,
        folder: null,
        folderPath: null,
        hash: generateFileName(basename),
        ext,
        mime: mimeType,
      };

      try {
        const pipeline = sharp();
        fileStream.pipe(pipeline);

        await pipeline.clone().stats();

        file.getStream = () => pipeline.clone();
        return processImage(file);
      } catch (err) {
        console.log('super error', err);

        file.getStream = () => fileStream;
        return processFile(file);
      }
    };

    const req = ctx.req;
    const bb = busboy({ headers: req.headers });

    const p = () =>
      new Promise((resolve, reject) => {
        bb.on('file', (name, file, info) => {
          if (name !== 'files') {
            // dismiss the file
            file.resume();
            return;
          }

          promises.push(onFile(_, file, info));
        });

        bb.on('field', (name, value) => {
          const parsedValue = JSON.parse(value);

          if (!data[name]) {
            data[name] = [parsedValue];
          } else {
            data[name].push(parsedValue);
          }
        });

        bb.on('finish', () => {
          resolve();
        });

        bb.on('error', (err) => {
          reject(err);
        });

        bb.on('close', () => {});

        req.pipe(bb);
      });

    await p();

    const res = await Promise.all(promises);

    const uploadedFiles = await Promise.all(
      res.map(async (result, idx) => {
        const info = data.fileInfo[idx];

        const config = strapi.config.get('plugin.upload');

        const entity = {
          ...result,
          provider: config.provider,
          // TODO: connect to folder
          folder: info.folder,
          folderPath: await fileService.getFolderPath(info.folder),
        };

        const { refId, ref, field } = info;

        if (refId && ref && field) {
          entity.related = [
            {
              id: refId,
              __type: ref,
              __pivot: { field },
            },
          ];
        }

        if (info.path) {
          entity.path = info.path;
        }

        return getService('upload').add(entity, { user });
      })
    );

    const signedFiles = await mapAsync(uploadedFiles, getService('file').signFileUrls);

    ctx.body = await pm.sanitizeOutput(signedFiles, { action: ACTIONS.read });
  },

  async upload(ctx) {
    return this.uploadV2(ctx);

    // const {
    //   query: { id },
    //   request: { files: { files } = {} },
    // } = ctx;

    // if (_.isEmpty(files) || files.size === 0) {
    //   if (id) {
    //     return this.updateFileInfo(ctx);
    //   }

    //   throw new ApplicationError('Files are empty');
    // }

    // await (id ? this.replaceFile : this.uploadFiles)(ctx);
  },
};
