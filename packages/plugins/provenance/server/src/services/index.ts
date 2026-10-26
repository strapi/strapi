import type { Core } from '@strapi/types';
import { createProvenanceService } from './provenance';
import { createRequestService } from './request';
import { createReviewWorkflowsService } from './review-workflows';
import { createSettingsService } from './settings';
import { createTokenProfileService } from './token-profiles';
import { createValuesService } from './values';

export default {
  provenance: createProvenanceService,
  reviewWorkflows: createReviewWorkflowsService,
  settings: createSettingsService,
  tokenProfiles: createTokenProfileService,
  values: createValuesService,
  request: ({ strapi }: { strapi: Core.Strapi }) =>
    createRequestService({
      strapi,
      tokenProfiles: strapi.plugin('provenance').service('tokenProfiles'),
    }),
};
