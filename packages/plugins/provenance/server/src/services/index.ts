import type { Core } from '@strapi/types';
import { createApprovalsService } from './approvals';
import { createProvenanceService } from './provenance';
import { createRequestService } from './request';
import { createSettingsService } from './settings';
import { createTokenProfileService } from './token-profiles';
import { createValuesService } from './values';

export default {
  approvals: createApprovalsService,
  provenance: createProvenanceService,
  settings: createSettingsService,
  tokenProfiles: createTokenProfileService,
  values: createValuesService,
  request: ({ strapi }: { strapi: Core.Strapi }) =>
    createRequestService({
      strapi,
      tokenProfiles: strapi.plugin('provenance').service('tokenProfiles'),
    }),
};
