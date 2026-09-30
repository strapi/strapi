import type { GetProjectType } from '../../../../shared/contracts/admin';

export default {
  // NOTE: Overrides CE admin controller
  async getProjectType(): Promise<GetProjectType.Response> {
    const flags = strapi.config.get('admin.flags', {});

    try {
      return {
        data: {
          // The license fields are nullable internally; the contract is not.
          isEE: Boolean(strapi.EE),
          isTrial: strapi.ee.isTrial,
          features: strapi.ee.features.list(),
          flags,
          type: strapi.ee.type ?? undefined,
          planPriceId: strapi.ee.planPriceId ?? undefined,
          projectType: strapi.ee.edition,
          ai: {
            enabled: strapi.ai.admin.isStrapiManagedAiEnabled(),
          },
        },
      };
    } catch {
      return {
        data: {
          isEE: false,
          isTrial: false,
          features: [],
          flags,
          projectType: 'Community',
          ai: { enabled: false },
        },
      };
    }
  },
};
