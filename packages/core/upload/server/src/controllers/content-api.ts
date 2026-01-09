import _ from 'lodash';
import utils from '@strapi/utils';

import type { Context } from 'koa';
import type { Core, Modules } from '@strapi/types';

import { getService } from '../utils';
import { FILE_MODEL_UID } from '../constants';
import { validateUploadBody } from './validation/content-api/upload';
import { FileInfo, Config } from '../types';

const { ValidationError } = utils.errors;

type PagePagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

type OffsetPagination = {
  start: number;
  limit: number;
  total: number;
};

type Pagination = PagePagination | OffsetPagination;

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    pagination: Pagination;
  };
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const sanitizeOutput = async (data: unknown | unknown[], ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth } = ctx.state;

    return strapi.contentAPI.sanitize.output(data, schema, { auth });
  };

  const validateQuery = async (data: Record<string, unknown>, ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth } = ctx.state;

    return strapi.contentAPI.validate.query(data, schema, { auth });
  };

  const sanitizeQuery = async (data: Record<string, unknown>, ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth } = ctx.state;

    return strapi.contentAPI.sanitize.query(data, schema, { auth });
  };

  const transformPagination = (
    files: Modules.EntityService.PaginatedResult<typeof FILE_MODEL_UID> & {
      _paginationFormat?: 'page' | 'offset';
      _originalPagination?: PagePagination | OffsetPagination;
    }
  ): PaginatedResponse<unknown> => {
    // Use the original pagination format if available, otherwise use the default
    const pagination = files._originalPagination || files.pagination;

    return {
      data: files.results,
      meta: {
        pagination: pagination as Pagination,
      },
    };
  };

  return {
    async find(ctx: Context) {
      await validateQuery(ctx.query, ctx);
      const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

      // Get plugin configuration to determine pagination behavior
      const config = strapi.config.get<Config>('plugin::upload');
      const usePagination = config?.paginatedResponses ?? false;

      let files;
      if (usePagination) {
        const pageResult = await getService('upload').findPage(sanitizedQuery);
        files = await transformPagination(pageResult);
      } else {
        files = await getService('upload').findMany(sanitizedQuery);
      }

      ctx.body = await sanitizeOutput(files, ctx);
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

      ctx.body = await sanitizeOutput(file, ctx);
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

      ctx.body = await sanitizeOutput(file, ctx);
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

      ctx.body = await sanitizeOutput(result, ctx);
    },

    async replaceFile(ctx: Context) {
      const {
        query: { id },
        request: { body, files: { files } = {} },
      } = ctx;

      // cannot replace with more than one file
      if (Array.isArray(files)) {
        throw new ValidationError('Cannot replace a file with multiple ones');
      }

      if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
        throw new ValidationError('File id is required and must be a single value');
      }

      const data = (await validateUploadBody(body)) as { fileInfo: FileInfo };

      const replacedFiles = await getService('upload').replace(id, { data, file: files });

      ctx.body = await sanitizeOutput(replacedFiles, ctx);
    },

    async uploadFiles(ctx: Context) {
      const {
        request: { body, files: { files } = {} },
      } = ctx;

      const data: any = await validateUploadBody(body, Array.isArray(files));

      const apiUploadFolderService = getService('api-upload-folder');

      const apiUploadFolder = await apiUploadFolderService.getAPIUploadFolder();

      if (Array.isArray(files)) {
        data.fileInfo = data.fileInfo || [];
        data.fileInfo = files.map((_f, i) => ({ ...data.fileInfo[i], folder: apiUploadFolder.id }));
      } else {
        data.fileInfo = { ...data.fileInfo, folder: apiUploadFolder.id };
      }

      const uploadedFiles = await getService('upload').upload({
        data,
        files: Array.isArray(files) ? files : [files],
      });

      ctx.body = await sanitizeOutput(uploadedFiles as any, ctx);
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
