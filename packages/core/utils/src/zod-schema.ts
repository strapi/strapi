/**
 * Re-export of the Zod v4 schema builder from the same version Strapi uses
 * internally. Use this for building schemas passed to content API param
 * registration (addQueryParams / addInputParams) so your code stays compatible
 * across Strapi minor/patch updates.
 *
 * @example
 * import { z } from '@strapi/utils';
 * strapi.contentAPI.addQueryParams({
 *   search: {
 *     schema: z.string().max(200).optional(),
 *     matchRoute: (route) => route.path.includes('articles'),
 *   },
 * });
 */
export { z } from 'zod/v4';
