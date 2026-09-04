import { merge } from 'lodash/fp';
import { async } from '@strapi/utils';

import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FILE_MODEL_UID } from '../constants';
import { findEntityAndCheckPermissions } from './utils/find-entity-and-check-permissions';
import { validateGenerateAIMetadataBody } from './validation/admin/ai-metadata';

export default {
  async find(ctx: Context) {
    const {
      state: { userAbility },
    } = ctx;

    const defaultQuery = { populate: { folder: true } };

    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    // validate the incoming user query params
    await pm.validateQuery(ctx.query);

    const query = await async.pipe(
      // Start by sanitizing the incoming query
      (q) => pm.sanitizeQuery(q),
      // Add the default query which should not be validated or sanitized
      (q) => merge(defaultQuery, q),
      // Add the dynamic filters based on permissions' conditions
      (q) => pm.addPermissionsQueryTo(q)
    )(ctx.query);

    const { results: files, pagination } = await getService('upload').findPage(query);

    // Sign file urls for private providers
    const signedFiles = await async.map(files, getService('file').signFileUrls);

    const sanitizedFiles = await pm.sanitizeOutput(signedFiles);

    return { results: sanitizedFiles, pagination };
  },

  async findOne(ctx: Context) {
    const {
      state: { userAbility },
      params: { id },
    } = ctx;

    const { pm, file } = await findEntityAndCheckPermissions(
      strapi,
      userAbility,
      ACTIONS.read,
      FILE_MODEL_UID,
      id
    );

    const signedFile = await getService('file').signFileUrls(file);
    ctx.body = await pm.sanitizeOutput(signedFile);
  },

  async destroy(ctx: Context) {
    const { id } = ctx.params;
    const { userAbility } = ctx.state;

    const { pm, file } = await findEntityAndCheckPermissions(
      strapi,
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    const [body] = await Promise.all([
      pm.sanitizeOutput(file, { action: ACTIONS.read }),
      getService('upload').remove(file),
    ]);

    ctx.body = body;
  },

  /**
   * `GET /upload/ai-metadata-jobs/pending-count`
   *
   * How many images a backfill job would have to process, i.e. those still
   * missing AI metadata, alongside the total image count.
   */
  async getAIMetadataPendingCount(ctx: Context) {
    const { userAbility } = ctx.state;

    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const aiMetadataService = getService('aiMetadata');

    // Check if AI service is enabled
    if (!(await aiMetadataService.isEnabled())) {
      return ctx.badRequest('AI Metadata service is not enabled');
    }

    try {
      const { imagesWithoutMetadataCount, totalImages } =
        await aiMetadataService.countImagesWithoutMetadata();

      ctx.body = {
        imagesWithoutMetadataCount,
        totalImages,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get AI metadata count';

      strapi.log.error('Failed to get AI metadata count', {
        message,
        error,
      });

      ctx.badRequest(message);
    }
  },

  /**
   * `POST /upload/ai-metadata-jobs`
   *
   * Create a backfill job that generates AI metadata for every image still
   * missing it, and return the job so the client can poll it. Processing runs
   * detached from this request; see `generateAIMetadata` for the synchronous
   * counterpart that works on an explicit selection.
   */
  async createAIMetadataJob(ctx: Context) {
    const { userAbility } = ctx.state;

    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.update,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const aiMetadataService = getService('aiMetadata');

    // Check if AI service is enabled
    if (!(await aiMetadataService.isEnabled())) {
      return ctx.badRequest('AI Metadata service is not enabled');
    }

    try {
      // Get count first to check if there are images to process
      const result = await aiMetadataService.countImagesWithoutMetadata();

      if (result.imagesWithoutMetadataCount === 0) {
        ctx.body = {
          count: 0,
          message: 'No images without metadata found',
        };
        return;
      }

      // Create job
      const jobService = getService('aiMetadataJobs');
      const jobId = await jobService.createJob();

      // Start async processing (fire and forget)
      aiMetadataService.processExistingFiles(jobId, ctx.state.user).catch((err: Error) => {
        strapi.log.error('AI metadata job failed:', err);
      });

      // Return immediately with job ID
      ctx.body = {
        jobId,
        status: 'pending',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate AI metadata';
      const cause = error instanceof Error && error.cause ? String(error.cause) : undefined;

      strapi.log.error('AI metadata generation failed in controller', {
        message,
        cause,
        error,
      });

      ctx.badRequest(cause ? `${message}: ${cause}` : message);
    }
  },

  /**
   * `POST /upload/actions/generate-ai-metadata`
   *
   * Generate AI metadata for the explicit selection of files in the body,
   * synchronously: the request resolves once every file has been processed and
   * reports the outcome per file, so a single bad id or a non-image in the
   * selection never fails the whole batch.
   *
   * For the whole-library backfill, see `createAIMetadataJob`.
   */
  async generateAIMetadata(ctx: Context) {
    const { userAbility } = ctx.state;
    const { body } = ctx.request;

    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.update,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const { fileIds } = await validateGenerateAIMetadataBody(body);

    const aiMetadataService = getService('aiMetadata');

    if (!(await aiMetadataService.isEnabled())) {
      return ctx.badRequest('AI Metadata service is not enabled');
    }

    const results = await aiMetadataService.generateForFiles(fileIds, ctx.state.user);

    ctx.body = { data: results };
  },

  /**
   * `GET /upload/ai-metadata-jobs/latest`
   *
   * The most recent still-active backfill job, so a client that reloads mid-run
   * can pick the progress bar back up. 404s when nothing is running.
   */
  async getLatestAIMetadataJob(ctx: Context) {
    if ((await getService('aiMetadata').isEnabled()) === false) {
      return ctx.notFound();
    }

    const jobService = getService('aiMetadataJobs');
    const job = await jobService.getLatestActiveJob();

    if (!job) {
      return ctx.notFound('No active job found');
    }

    ctx.body = job;
  },
};
