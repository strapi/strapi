import { join } from 'path';

import type { Core, UID } from '@strapi/types';

import { readFile } from 'fs/promises';
import { Preview } from '../../../../shared/contracts';

import { getService } from '../utils';
import { validatePreviewUrl } from './validation/preview';

const createPreviewController = () => {
  return {
    /**
     * Transforms an entry into a preview URL, so that it can be previewed
     * in the Content Manager.
     */
    async getPreviewUrl(ctx) {
      const uid = ctx.params.contentType as UID.ContentType;
      const query = ctx.request.query as Preview.GetPreviewUrl.Request['query'];

      // Validate the request parameters
      const params = await validatePreviewUrl(strapi, uid, query);

      // TODO: Permissions to preview content

      // Get the preview URL by using the user-defined config handler
      const previewService = getService(strapi, 'preview');
      const url = await previewService.getPreviewUrl(uid, params);

      // If no url is found, set status to 204
      if (!url) {
        ctx.status = 204;
      }

      return {
        data: { url: url || undefined },
      } satisfies Preview.GetPreviewUrl.Response;
    },

    /**
     * Serves the standalone preview script verbatim as JavaScript. The admin fetches
     * this, injects the config, and posts it to the preview iframe
     */
    async getPreviewScript(ctx) {
      ctx.type = 'application/javascript';
      ctx.body = await readFile(join(__dirname, 'previewScript.js'), 'utf8');
    },
  } satisfies Core.Controller;
};

export { createPreviewController };
