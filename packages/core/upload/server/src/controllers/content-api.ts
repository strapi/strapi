import _ from 'lodash';
import { async, errors } from '@strapi/utils';

import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import { getService } from '../utils';
import { FILE_MODEL_UID } from '../constants';
import { resolveFileId } from '../services/upload';
import { validateUploadBody } from './validation/content-api/upload';
import { FileInfo } from '../types';
import { prepareUploadRequest } from '../utils/mime-validation';
import { refuseFileById as refuseFileByIdFor } from '../utils/refuse-file-by-id';

const { ValidationError, NotFoundError, ForbiddenError } = errors;

const isNumericId = (id: string) => /^\d+$/.test(id);

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const sanitizeOutput = async (data: unknown | unknown[], ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth } = ctx.state;

    return strapi.contentAPI.sanitize.output(data, schema, { auth });
  };

  const validateQuery = async (data: Record<string, unknown>, ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth, route } = ctx.state;

    // Same behaviour as core-api: only throw on unknown params if the project turned on strictParams.
    // Either way they never reach the query, because sanitizeQuery strips them.
    const strictParams = strapi.config.get('api.rest.strictParams');

    return strapi.contentAPI.validate.query(data, schema, {
      auth,
      route,
      ...(typeof strictParams === 'boolean' && { strictParams }),
    });
  };

  const sanitizeQuery = async (data: Record<string, unknown>, ctx: Context) => {
    const schema = strapi.getModel(FILE_MODEL_UID);
    const { auth, route } = ctx.state;

    // The upload service hands unknown root keys (e.g. `where`) straight to the query engine
    return strapi.contentAPI.sanitize.query(data, schema, { auth, route, strictParams: true });
  };

  /**
   * Whether the caller's permissions carry data rules (an end-users caller with a role). Everything
   * below that narrows a write is for these callers only: API tokens, Users & Permissions and the
   * admin keep what they have today.
   */
  const hasDataRules = (ctx: Context) =>
    strapi.contentAPI.permissions.checker.isActive(ctx.state.auth);

  const refuseFileById = (ctx: Context) => refuseFileByIdFor(strapi, ctx.state.auth);

  const isGiven = (value: unknown) => value !== undefined && value !== null && value !== '';

  /**
   * `ref`, `refId` and `field` link the new file to an entry. Linking changes that entry, so the
   * caller needs what an update of it needs: the update route of its type, and the entry check the
   * core controllers run (`assertEntry`) over every locale, as the link is made on every row of the
   * document. `field` has to be a media attribute of the type. Components are refused: they have no
   * documentId to check an entry by.
   */
  const assertLinkAllowed = async (ctx: Context, body: Record<string, unknown> = {}) => {
    const { ref, refId, field } = body;

    if (!hasDataRules(ctx) || ![ref, refId, field].some(isGiven)) {
      return;
    }

    if (typeof ref !== 'string' || typeof refId !== 'string' || typeof field !== 'string') {
      throw new ValidationError('ref, refId and field are each required, as text, to link a file');
    }

    const model = strapi.getModel(ref as any);

    if (model?.modelType !== 'contentType') {
      throw new ValidationError('ref must be the uid of a content type');
    }

    if (field === '' || model.attributes?.[field]?.type !== 'media') {
      throw new ValidationError('field must be a media attribute of ref');
    }

    const { auth } = ctx.state;

    if (!auth?.ability?.can(`${ref}.update`)) {
      throw new ForbiddenError('Forbidden');
    }

    // A numeric id names a row, not a document: the entry check can't be made on it
    if (isNumericId(refId)) {
      throw new ValidationError('refId must be the documentId of an entry');
    }

    await strapi.contentAPI.permissions.assertEntry(auth, 'update', ref as any, refId, {
      locale: '*',
    });

    // The link writes `field`, so the caller needs that field on an update of this entry: for
    // every entry, or through a conditioned row whose condition this entry matches
    const { always, conditional } = strapi.contentAPI.permissions.checker.fieldsFor(
      auth,
      'update',
      ref
    );
    const lists = (fields: string[] | null) => fields === null || fields.includes(field);

    if (lists(always)) {
      return;
    }

    // The link is written on every row of the document (each locale, draft and published), so
    // every one of them has to match a conditioned row that gives the field. Counted both ways
    // rather than with a negated filter, which a null in a condition field would slip through.
    const filters = conditional.filter((group) => lists(group.fields)).map((group) => group.filter);

    if (filters.length > 0) {
      const rows = strapi.db.query(ref);
      const [all, covered] = await Promise.all([
        rows.count({ where: { documentId: refId } }),
        rows.count({ where: { documentId: refId, $or: filters } }),
      ]);

      if (all > 0 && covered === all) {
        return;
      }
    }

    throw new ForbiddenError('Forbidden');
  };

  return {
    async find(ctx: Context) {
      await validateQuery(ctx.query, ctx);
      const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

      const files = await getService('upload').findMany(sanitizedQuery);

      const signedFiles = await async.map(files, getService('file').signFileUrls);

      ctx.body = await sanitizeOutput(signedFiles, ctx);
    },

    async findPage(ctx: Context) {
      await validateQuery(ctx.query, ctx);
      const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

      const { results, pagination } = await getService('upload').findAndCountPage(sanitizedQuery);

      const data = await sanitizeOutput(results, ctx);

      ctx.body = { data, meta: { pagination } };
    },

    async findOne(ctx: Context) {
      await validateQuery(ctx.query, ctx);
      const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

      const id = await resolveFileId(strapi, ctx.params.id);
      const file = id ? await getService('upload').findOne(id, sanitizedQuery.populate!) : null;

      if (!file) {
        return ctx.notFound('file.notFound');
      }

      const signedFile = await getService('file').signFileUrls(file);

      ctx.body = await sanitizeOutput(signedFile, ctx);
    },

    async destroy(ctx: Context) {
      refuseFileById(ctx);

      const id = await resolveFileId(strapi, ctx.params.id);
      const file = id ? await getService('upload').findOne(id) : null;

      if (!file) {
        return ctx.notFound('file.notFound');
      }

      await getService('upload').remove(file);

      const signedFile = await getService('file').signFileUrls(file);

      ctx.body = await sanitizeOutput(signedFile, ctx);
    },

    async updateFileInfo(ctx: Context) {
      refuseFileById(ctx);

      const {
        query: { id },
        request: { body },
      } = ctx;
      const data = await validateUploadBody(body);

      if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
        throw new ValidationError('File id is required and must be a single value');
      }

      const fileId = await resolveFileId(strapi, id);

      if (!fileId) {
        throw new NotFoundError();
      }

      const result = await getService('upload').updateFileInfo(fileId, data.fileInfo as any);

      const signedResult = await getService('file').signFileUrls(result);

      ctx.body = await sanitizeOutput(signedResult, ctx);
    },

    async replaceFile(ctx: Context) {
      refuseFileById(ctx);

      const {
        query: { id },
        request: { body, files: { files: filesInput } = {} },
      } = ctx;

      // cannot replace with more than one file
      if (Array.isArray(filesInput) && filesInput.length > 1) {
        throw new ValidationError('Cannot replace a file with multiple ones');
      }

      const files = Array.isArray(filesInput) ? filesInput[0] : filesInput;

      const {
        validFiles,
        filteredBody,
        errors: validationErrors,
      } = await prepareUploadRequest(files, body, strapi);
      if (validFiles.length === 0) {
        throw new errors.ValidationError(validationErrors[0].message);
      }

      if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
        throw new ValidationError('File id is required and must be a single value');
      }

      const fileId = await resolveFileId(strapi, id);

      if (!fileId) {
        throw new NotFoundError();
      }

      const data = (await validateUploadBody(filteredBody)) as { fileInfo: FileInfo };

      const replacedFiles = await getService('upload').replace(fileId, {
        data,
        file: validFiles[0],
      });

      const signedFiles = await getService('file').signFileUrls(replacedFiles);

      ctx.body = await sanitizeOutput(signedFiles, ctx);
    },

    async uploadFiles(ctx: Context) {
      const {
        request: { body, files: { files: filesInput } = {} },
      } = ctx;

      await assertLinkAllowed(ctx, body);

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
