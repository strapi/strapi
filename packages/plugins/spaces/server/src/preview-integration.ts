import type { Core } from '@strapi/types';

import { getService } from './utils';
import { getRequestSpace } from './utils/space-scope';

/**
 * Spaces × live preview. The preview handler configured in
 * `config/admin.ts` receives the active workspace under
 * `params.plugins.spaces` — `{ slug, name, previewBaseUrl }` — so each
 * workspace can preview on its own domain:
 *
 *   handler: (uid, { documentId, locale, status, plugins }) => {
 *     const base = plugins?.spaces?.previewBaseUrl ?? 'https://www.example.com';
 *     return `${base}/preview?documentId=${documentId}&locale=${locale}&status=${status}`;
 *   }
 *
 * The CSP `frame-src` stays the static union of `allowedOrigins`: list every
 * workspace's origin there. No-op when the preview seam isn't available.
 */
export const patchPreviewForSpaces = (strapi: Core.Strapi) => {
  const previewConfig = strapi.plugin('content-manager')?.service('preview-config') as
    | { registerParamsProvider?: (name: string, provider: () => Promise<unknown>) => void }
    | undefined;
  if (typeof previewConfig?.registerParamsProvider !== 'function') {
    return;
  }

  previewConfig.registerParamsProvider('spaces', async () => {
    const request = getRequestSpace(strapi);
    if (!request) {
      return undefined;
    }
    const space = await getService('spaces').getById(request.id);
    if (!space) {
      return undefined;
    }
    return {
      id: space.id,
      slug: space.slug,
      name: space.name,
      previewBaseUrl: space.previewBaseUrl ?? null,
    };
  });
};
