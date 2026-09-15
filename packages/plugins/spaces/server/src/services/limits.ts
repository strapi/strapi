import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { LICENSE_FEATURE } from '../../../shared/constants';

const { ApplicationError } = errors;

/**
 * How many spaces a licence allows.
 *
 * The number comes from the licence feature's options when it carries one, and
 * can be lowered — never raised — by configuration, so that a project can hold
 * itself to fewer spaces than it is entitled to.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const service = {
    getMaximum(): number | null {
      const fromLicense = strapi.ee.features.get?.(LICENSE_FEATURE) as
        | { options?: { maximumSpaces?: number } }
        | undefined;

      const licensed = fromLicense?.options?.maximumSpaces ?? null;
      const configured = strapi.config.get('plugin::spaces.maxSpaces', null) as number | null;

      if (licensed === null) {
        return configured;
      }

      return configured === null ? licensed : Math.min(licensed, configured);
    },

    async assertCanCreate(): Promise<void> {
      const maximum = service.getMaximum();

      if (maximum === null) {
        return;
      }

      const current = await strapi.service('plugin::spaces.spaces').count();

      if (current >= maximum) {
        throw new ApplicationError(
          `This project is limited to ${maximum} ${maximum === 1 ? 'space' : 'spaces'}.`
        );
      }
    },
  };

  return service;
};
