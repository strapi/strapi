import _ from 'lodash';
import utils, { async, errors } from '@strapi/utils';

import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import { getService } from '../utils';
import { FILE_MODEL_UID } from '../constants';
import { validateUploadBody } from './validation/content-api/upload';
import { FileInfo } from '../types';
import { prepareUploadRequest } from '../utils/mime-validation';

const { ValidationError } = utils.errors;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const sanitizeOutput = async (data: unknown | unknown[], ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth } = ctx.state;

    return strapi.contentAPI.sanitize.output(data, schema, { auth });
  };

  const validateQuery = async (data: Record<string, unknown>, ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth, route } = ctx.state;

    return strapi.contentAPI.validate.query(data, schema, { auth, route });
  };

  const sanitizeQuery = async (data: Record<string, unknown>, ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth, route } = ctx.state;

    return strapi.contentAPI.sanitize.query(data, schema, { auth, route });
  };

  return {
    async find(ctx: Context) {
      await validateQuery(ctx.query, ctx);
      const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

      const files = await getService('upload').findMany(sanitizedQuery);

      const signedFiles = await async.map(files, getService('file').signFileUrls);

      ctx.body = await sanitizeOutput(signedFiles, ctx);
    },

    async findOne(ctx: Context) {
      const {
        params: { id },
      } = ctx;

      await validateQuery(ctx.query, ctx);
      const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

      const file = await getService('upload').findOne(id, sanitizedQuery.populate!);

      if (!file) {
        return ctx.notFound('file.notFound');
      }

      const signedFile = await getService('file').signFileUrls(file);

      ctx.body = await sanitizeOutput(signedFile, ctx);
    },

    async destroy(ctx: Context) {
      const {
        params: { id },
      } = ctx;

      const file = await getService('upload').findOne(id);

      if (!file) {
        return ctx.notFound('file.notFound');
      }

      await getService('upload').remove(file);

      const signedFile = await getService('file').signFileUrls(file);

      ctx.body = await sanitizeOutput(signedFile, ctx);
    },

    async updateFileInfo(ctx: Context) {
      const {
        query: { id },
        request: { body },
      } = ctx;
      const data = await validateUploadBody(body);

      if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
        throw new ValidationError('File id is required and must be a single value');
      }

      const result = await getService('upload').updateFileInfo(id, data.fileInfo as any);

      const signedResult = await getService('file').signFileUrls(result);

      ctx.body = await sanitizeOutput(signedResult, ctx);
    },

    async replaceFile(ctx: Context) {
      const {
        query: { id },
        request: { body, files: { files: filesInput } = {} },
      } = ctx;

      const {
        validFiles,
        filteredBody,
        errors: validationErrors,
      } = await prepareUploadRequest(filesInput, body, strapi);
      if (validFiles.length === 0) {
        throw new errors.ValidationError(validationErrors[0].message);
      }

      // cannot replace with more than one file
      if (Array.isArray(filesInput)) {
        throw new ValidationError('Cannot replace a file with multiple ones');
      }

      if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
        throw new ValidationError('File id is required and must be a single value');
      }

      const data = (await validateUploadBody(filteredBody)) as { fileInfo: FileInfo };

      const replacedFiles = await getService('upload').replace(id, { data, file: validFiles[0] });

      const signedFiles = await getService('file').signFileUrls(replacedFiles);

      ctx.body = await sanitizeOutput(signedFiles, ctx);
    },

    async uploadFiles(ctx: Context) {
      const {
        request: { body, files: { files: filesInput } = {} },
      } = ctx;

      const {
        validFiles,
        filteredBody,
        errors: validationErrors,
      } = await prepareUploadRequest(filesInput, body, strapi);
      if (validFiles.length === 0) {
        throw new errors.ValidationError(validationErrors[0].message);
      }

      const isMultipleFiles = validFiles.length > 1;
      const data: any = await validateUploadBody(filteredBody, isMultipleFiles);

      const apiUploadFolderService = getService('api-upload-folder');

      const apiUploadFolder = await apiUploadFolderService.getAPIUploadFolder();

      if (isMultipleFiles) {
        data.fileInfo = data.fileInfo || [];
        data.fileInfo = validFiles.map((_f, i) => ({
          ...data.fileInfo[i],
          folder: apiUploadFolder.id,
        }));
      } else {
        data.fileInfo = { ...data.fileInfo, folder: apiUploadFolder.id };
      }

      const uploadedFiles = await getService('upload').upload({
        data,
        files: validFiles,
      });

      const signedFiles = await async.map(uploadedFiles as any[], getService('file').signFileUrls);

      ctx.body = await sanitizeOutput(signedFiles, ctx);
      ctx.status = 201;
    },

    // TODO: split into multiple endpoints
    async upload(ctx: Context) {
      const {
        query: { id },
        request: { files: { files } = {} },
      } = ctx;

      if (_.isEmpty(files) || (!Array.isArray(files) && files.size === 0)) {
        if (id) {
          return this.updateFileInfo(ctx);
        }

        throw new ValidationError('Files are empty');
      }

      await (id ? this.replaceFile : this.uploadFiles)(ctx);
    },
  };
};
