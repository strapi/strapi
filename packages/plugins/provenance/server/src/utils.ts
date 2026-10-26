import type { Core } from '@strapi/types';

import type { ProvenanceService } from './services/provenance';
import type { RequestService } from './services/request';
import type { ReviewWorkflowsService } from './services/review-workflows';
import type { SettingsService } from './services/settings';
import type { TokenProfileService } from './services/token-profiles';
import type { ValuesService } from './services/values';

type Services = {
  provenance: ProvenanceService;
  request: RequestService;
  reviewWorkflows: ReviewWorkflowsService;
  settings: SettingsService;
  tokenProfiles: TokenProfileService;
  values: ValuesService;
};

export const getService = <TName extends keyof Services>(
  strapi: Core.Strapi,
  name: TName
): Services[TName] => {
  return strapi.plugin('provenance').service(name) as Services[TName];
};
