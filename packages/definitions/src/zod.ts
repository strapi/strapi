import * as z from 'zod/v4';

/**
 * Re-export of the Zod v4 schema builder from the same version Strapi uses
 * internally. Definitions-owned schemas must import from here to stay
 * compatible across Strapi updates.
 *
 * @example
 * import { z } from '@strapi/definitions';
 */
export { z };
