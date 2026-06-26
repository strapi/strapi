import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import _ from 'lodash';
import { errors, async } from '@strapi/utils';

import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FILE_MODEL_UID } from '../constants';
import { validateBulkUpdateBody, validateUploadBody } from './validation/admin/upload';
import { findEntityAndCheckPermissions } from './utils/find-entity-and-check-permissions';
import { Config, FileInfo } from '../types';
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

        // Sign file urls for private providers
        const signedFile = await getService('file').signFileUrls(updated);

        return pm.sanitizeOutput(signedFile, { action: ACTIONS.read });
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

    // Sign file urls for private providers
    const signedFile = await getService('file').signFileUrls(file);

    ctx.body = await pm.sanitizeOutput(signedFile, { action: ACTIONS.read });
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

    // Regenerate AI metadata for image replacements so the alt text / caption
    // reflect the new file content. Mirrors the post-upload hook in
    // `uploadFiles`; failure is logged and swallowed to keep the replace flow
    // resilient when the AI provider is unavailable.
    const aiMetadataService = getService('aiMetadata');
    if (replacedFile?.mime?.startsWith('image/') && (await aiMetadataService.isEnabled())) {
      try {
        const metadataResults = await aiMetadataService.processFiles([replacedFile]);
        await aiMetadataService.updateFilesWithAIMetadata([replacedFile], metadataResults, user);
      } catch (error) {
        strapi.log.warn('AI metadata generation failed on replace, proceeding without it', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

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
const alignedFilesArray = data.fileInfo.map((info, index) => {
  const match = filesArray.find((file) => file.originalFilename === info.name);
  if (!match) {
    return filesArray[index];
  }
  return match;
});

if (alignedFilesArray.every(Boolean)) {
  filesArray = alignedFilesArray as any[];
} else {
  strapi.log.warn(
    'Could not align file order by name; using original order'
  );
}

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
   * Upload a single file and return the created File.
   *
   * Accepts one file per request (multipart `files` + `fileInfo`) and returns a
   * single `File` object. Unlike `uploadFiles`, it does **not** run AI metadata
   * generation inline — that responsibility is decoupled and will be handled by a
   * background job. Auth and permission checks mirror `POST /upload`.
   */
  async unstable_uploadFile(ctx: Context) {
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

    // Accept a single file per request; ignore any extras defensively.
    const file = Array.isArray(files) ? files[0] : files;
    const fileName = file.originalFilename || 'unknown';

    // Parse the single fileInfo object from the multipart body.
    let fileInfo: UploadFileInfo = {
      name: fileName,
      caption: null,
      alternativeText: null,
      folder: null,
    };
    if (body?.fileInfo) {
      const raw = body.fileInfo;
      if (typeof raw === 'string') {
        fileInfo = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        fileInfo = (typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0]) as UploadFileInfo;
      } else {
        fileInfo = raw as UploadFileInfo;
      }
    }

    // Validate this single file using security checks.
    const { validFiles, errors: validationErrors } = await prepareUploadRequest(
      file,
      { fileInfo: JSON.stringify(fileInfo) },
      strapi
    );

    if (validFiles.length === 0) {
      throw new errors.ValidationError(validationErrors[0]?.message || 'Validation failed');
    }

    const data = await validateUploadBody({ fileInfo }, false);
    const [uploadedFile] = await uploadService.upload({ data, files: [validFiles[0]] }, { user });

    if (uploadedFile.mime?.startsWith('image/')) {
      await getService('metrics').trackUsage('didUploadImage');
    }

    // No inline AI metadata generation — intentionally decoupled for the async job.

    // Sign file url for private providers.
    const signedFile = await getService('file').signFileUrls(uploadedFile);

    ctx.body = await pm.sanitizeOutput(signedFile, { action: ACTIONS.read });
    ctx.status = 201;
  },

  /**
   * @experimental
   * Upload files from URLs with SSE streaming for per-file progress
   *
   * Accepts JSON body with URLs and fetches them server-side.
   * Streams Server-Sent Events as each URL is fetched and uploaded:
   * - file:fetching  — when starting to fetch a URL
   * - file:uploading — when upload starts for a fetched file
   * - file:complete  — when a file is successfully uploaded
   * - file:error     — when a URL fetch or upload fails
   * - stream:complete — final summary with all results
   */
  async unstable_uploadFromUrls(ctx: Context) {
    const {
      state: { userAbility, user },
      request: { body },
    } = ctx;

    const uploadService = getService('upload');
    const fileService = getService('file');
    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    // Parse and validate request body
    const { urls, folderId } = body as { urls?: string[]; folderId?: number | null };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new errors.ApplicationError('URLs are required');
    }

    if (urls.length > 20) {
      throw new errors.ApplicationError('Maximum 20 URLs allowed per request');
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

    const total = urls.length;
    const uploadErrors: FileUploadError[] = [];
    const successfulFiles: any[] = [];

    // Create temp directory for fetched files
    const tmpWorkingDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-url-upload-'));
    const { sizeLimit } = strapi.config.get<Config>('plugin::upload');

    try {
      // Process each URL sequentially
      for (let i = 0; i < urls.length; i += 1) {
        const url = urls[i];

        writeSSE('file:fetching', { url, index: i, total });

        try {
          // Fetch URL to temp file
          const { file } = await fileService.fetchUrlToInputFile(
            url,
            tmpWorkingDirectory,
            sizeLimit
          );
          const fileName = file.originalFilename;

          writeSSE('file:uploading', {
            name: fileName,
            index: i,
            total,
            size: file.size,
          });

          // Validate using security checks
          const fileInfo: UploadFileInfo = {
            name: fileName,
            caption: null,
            alternativeText: null,
            folder: folderId ?? null,
          };

          const { validFiles, errors: validationErrors } = await prepareUploadRequest(
            file,
            { fileInfo: JSON.stringify(fileInfo) },
            strapi
          );

          if (validFiles.length === 0) {
            const errorMessage = validationErrors[0]?.message || 'Validation failed';
            uploadErrors.push({ name: fileName, message: errorMessage });
            writeSSE('file:error', { name: fileName, url, index: i, message: errorMessage });
          } else {
            // Upload the file
            const data = await validateUploadBody({ fileInfo }, false);
            const [uploadedFile] = await uploadService.upload(
              { data, files: [validFiles[0]] },
              { user }
            );

            // Sign file url
            const signedFile = await fileService.signFileUrls(uploadedFile);
            successfulFiles.push(signedFile);

            writeSSE('file:complete', { name: fileName, index: i, file: signedFile });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          uploadErrors.push({ name: url, message: errorMessage });
          writeSSE('file:error', { url, index: i, message: errorMessage });
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
    } finally {
      // Clean up temp directory
      await fse.remove(tmpWorkingDirectory);
    }

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
