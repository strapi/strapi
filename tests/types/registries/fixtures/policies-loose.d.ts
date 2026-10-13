import type {} from '@strapi/types';

// Contracts that a consumer cannot check: `any`, and a third-party type whose package does not
// resolve. `skipLibCheck` hides the unresolved import, so the config is an error type.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackagePolicies {
        'plugin::loose.any': any;
        'plugin::loose.unresolved': import('missing-policy-options').Options;
        'plugin::loose.required': { role: string };
      }
    }
  }
}
