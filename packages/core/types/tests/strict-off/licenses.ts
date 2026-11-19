import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

// License gates are strict-only: without strict types, gated lookups keep develop's types, even in a
// declared license scope.
type LicenseChecks = [
  Expect<Equal<Core.LicenseScope, 'declared'>>,
  Expect<Equal<Core.ServiceFor<'plugin::legacy.licensed'>, Core.Service>>,
  Expect<Equal<Core.ServiceFor<'plugin::legacy.unlicensed'>, Core.Service>>,
  Expect<Equal<Core.ControllerFor<'plugin::legacy.licensed'>, Core.Controller>>,
  Expect<Equal<Core.Strapi['services']['plugin::legacy.licensed'], Core.Service>>,
  Expect<Equal<Core.Strapi['controllers']['plugin::legacy.licensed'], Core.Controller>>,
];
declare const licenseChecks: LicenseChecks;
licenseChecks satisfies unknown;

// License feature reads and entitlements keep develop's types: any name, and `get` may return a
// string.
type LicenseFeatureReadChecks = [
  Expect<
    Equal<
      Core.Strapi['ee']['features'],
      {
        isEnabled: (feature: string) => boolean;
        list: () => { name: string; [key: string]: any }[];
        get: (feature: string) => string | { name: string; [key: string]: any } | undefined;
      }
    >
  >,
  Expect<Equal<Core.LicenseFeatureLookup<'reveiw-workflows'>, 'reveiw-workflows'>>,
  Expect<
    Equal<
      Core.Strapi['ee']['entitlements'],
      {
        register: (input: {
          feature: string;
          limits: Array<{
            key: string;
            unit?: 'days' | 'count';
            get: (
              feature?:
                string | { name: string; options?: Record<string, unknown>; [key: string]: unknown }
            ) => unknown;
          }>;
        }) => void;
        list: () => Array<{
          feature: string;
          limits: Array<{ key: string; unit?: 'days' | 'count'; value: number | null }>;
        }>;
        listRetained: () => Array<{
          feature: string;
          limits: Array<{ key: string; unit?: 'days' | 'count'; value: number | null }>;
        }>;
      }
    >
  >,
];
declare const licenseFeatureReadChecks: LicenseFeatureReadChecks;
licenseFeatureReadChecks satisfies unknown;
