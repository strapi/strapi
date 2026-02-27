import _ from 'lodash';
import { errors, async } from '@strapi/utils';

import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FILE_MODEL_UID } from '../constants';
import { validateBulkUpdateBody, validateUploadBody } from './validation/admin/upload';
import { findEntityAndCheckPermissions } from './utils/find-entity-and-check-permissions';
import { FileInfo } from '../types';
import { prepareUploadRequest, type FileUploadError } from '../utils/mime-validation';
import type { UploadFileInfo } from '../../../shared/contracts/files';

export default {
  async bulkUpdateFileInfo(ctx: Context) {
    const {
      state: { userAbility, user },
      request: { body },
    } = ctx;

    const { updates } = await validateBulkUpdateBody(body);
    const uploadService = getService('upload');

    const results = await async.map(
      updates,
      async ({ id, fileInfo }: { id: number; fileInfo: FileInfo }) => {
        const { pm } = await findEntityAndCheckPermissions(
          userAbility,
          ACTIONS.update,
          FILE_MODEL_UID,
          id
        );

        const updated = await uploadService.updateFileInfo(id, fileInfo as any, { user });
        return pm.sanitizeOutput(updated, { action: ACTIONS.read });
      }
    );

    ctx.body = results;
  },

  async updateFileInfo(ctx: Context) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body },
    } = ctx;

    if (typeof id !== 'string') {
      throw new errors.ValidationError('File id is required');
    }

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    const data = await validateUploadBody(body);

    const file = await uploadService.updateFileInfo(id, data.fileInfo as any, { user });

    ctx.body = await pm.sanitizeOutput(file, { action: ACTIONS.read });
  },

  async replaceFile(ctx: Context) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body, files: { files } = {} },
    } = ctx;

    if (typeof id !== 'string') {
      throw new errors.ValidationError('File id is required');
    }

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    if (Array.isArray(files)) {
      throw new errors.ApplicationError('Cannot replace a file with multiple ones');
    }

    const {
      validFiles,
      filteredBody,
      errors: validationErrors,
    } = await prepareUploadRequest(files, body, strapi);
    if (validFiles.length === 0) {
      throw new errors.ValidationError(validationErrors[0].message);
    }

    const data = (await validateUploadBody(filteredBody)) as { fileInfo: FileInfo };
    const replacedFile = await uploadService.replace(id, { data, file: validFiles[0] }, { user });

    // Sign file urls for private providers
    const signedFile = await getService('file').signFileUrls(replacedFile);

    ctx.body = await pm.sanitizeOutput(signedFile, { action: ACTIONS.read });
  },

  async uploadFiles(ctx: Context) {
    const {
      state: { userAbility, user },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService('upload');
    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const {
      validFiles,
      filteredBody,
      errors: validationErrors,
    } = await prepareUploadRequest(files, body, strapi);
    if (validFiles.length === 0) {
      throw new errors.ValidationError(validationErrors[0].message);
    }

    const isMultipleFiles = validFiles.length > 1;
    const data = await validateUploadBody(filteredBody, isMultipleFiles);

    let filesArray = validFiles;

    if (
      data.fileInfo &&
      Array.isArray(data.fileInfo) &&
      filesArray.length === data.fileInfo.length
    ) {
      // Reorder filesArray to match data.fileInfo order
      const alignedFilesArray = data.fileInfo
        .map((info) => {
          return filesArray.find((file) => file.originalFilename === info.name);
        })
        .filter(Boolean) as any[];

      filesArray = alignedFilesArray;
    }

    // Upload files first to get thumbnails
    const uploadedFiles = await uploadService.upload({ data, files: filesArray }, { user });
    if (uploadedFiles.some((file) => file.mime?.startsWith('image/'))) {
      await getService('metrics').trackUsage('didUploadImage');
    }

    const aiMetadataService = getService('aiMetadata');

    // AFTER upload - generate AI metadata for images
    if (await aiMetadataService.isEnabled()) {
      try {
        const metadataResults = await aiMetadataService.processFiles(uploadedFiles);
        // Update the uploaded files with AI metadata
        await aiMetadataService.updateFilesWithAIMetadata(uploadedFiles, metadataResults, user);
      } catch (error) {
        strapi.log.warn('AI metadata generation failed, proceeding without AI enhancements', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sign file urls for private providers
    const signedFiles = await async.map(uploadedFiles, getService('file').signFileUrls);

    ctx.body = await pm.sanitizeOutput(signedFiles, { action: ACTIONS.read });
    ctx.status = 201;
  },

  /**
   * @experimental
   * Stream upload files with SSE streaming for per-file progress
   *
   * Streams Server-Sent Events as each file is validated and uploaded:
   * - file:uploading — when processing starts for a file
   * - file:complete  — when a file is successfully uploaded
   * - file:error     — when a file fails validation or upload
   * - stream:complete — final summary with all results
   *
   */
  async unstable_uploadFilesStream(ctx: Context) {
    const {
      state: { userAbility, user },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService('upload');
    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    if (_.isEmpty(files) || (!Array.isArray(files) && files.size === 0)) {
      throw new errors.ApplicationError('Files are empty');
    }

    // Take manual control of the response for SSE streaming
    ctx.respond = false;
    const res = ctx.res;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const writeSSE = (event: string, data: Record<string, unknown>) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Normalize files to an array
    const filesArray = Array.isArray(files) ? files : [files];
    const total = filesArray.length;

    // Parse fileInfo from body
    // Multipart forms send fileInfo as either:
    //   - An array of JSON strings (one per file)
    //   - A single JSON string (one file, or a JSON-encoded array)
    let parsedFileInfo: UploadFileInfo[] = [];
    if (body?.fileInfo) {
      const raw = body.fileInfo;
      if (Array.isArray(raw)) {
        parsedFileInfo = raw.map((fi: unknown) =>
          typeof fi === 'string' ? JSON.parse(fi) : fi
        ) as UploadFileInfo[];
      } else if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        // Handle case where a single string contains a JSON array
        parsedFileInfo = (Array.isArray(parsed) ? parsed : [parsed]) as UploadFileInfo[];
      } else {
        parsedFileInfo = [raw as UploadFileInfo];
      }
    }

    const uploadErrors: FileUploadError[] = [];
    const successfulFiles: any[] = [];

    // Process each file sequentially with inline validation
    for (let i = 0; i < filesArray.length; i += 1) {
      const file = filesArray[i];
      const fileName = file.originalFilename || 'unknown';
      const fileInfo: UploadFileInfo = parsedFileInfo[i] || {
        name: fileName,
        caption: null,
        alternativeText: null,
        folder: null,
      };

      writeSSE('file:uploading', { name: fileName, index: i, total, size: file.size || 0 });

      try {
        // Validate this single file using security checks
        const { validFiles, errors: validationErrors } = await prepareUploadRequest(
          file,
          { fileInfo: JSON.stringify(fileInfo) },
          strapi
        );

        if (validFiles.length === 0) {
          const errorMessage = validationErrors[0]?.message || 'Validation failed';
          uploadErrors.push({ name: fileName, message: errorMessage });
          writeSSE('file:error', { name: fileName, index: i, message: errorMessage });
        } else {
          // Validate using the already-parsed single fileInfo object directly
          const data = await validateUploadBody({ fileInfo }, false);
          const [uploadedFile] = await uploadService.upload(
            { data, files: [validFiles[0]] },
            { user }
          );

          // Sign file url
          const signedFile = await getService('file').signFileUrls(uploadedFile);
          successfulFiles.push(signedFile);

          writeSSE('file:complete', { name: fileName, index: i, file: signedFile });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        uploadErrors.push({ name: fileName, message: errorMessage });
        writeSSE('file:error', { name: fileName, index: i, message: errorMessage });
      }
    }

    // Track image upload metric once if any images were uploaded
    if (successfulFiles.some((file) => file.mime?.startsWith('image/'))) {
      await getService('metrics').trackUsage('didUploadImage');
    }

    // Send final stream summary
    writeSSE('stream:complete', {
      data: await pm.sanitizeOutput(successfulFiles, { action: ACTIONS.read }),
      errors: uploadErrors,
    });

    res.end();
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

      throw new errors.ApplicationError('Files are empty');
    }

    await (id ? this.replaceFile : this.uploadFiles)(ctx);
  },
};
