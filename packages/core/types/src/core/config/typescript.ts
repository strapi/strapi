import type { LicenseFeatureName } from '../license';

/**
 * Input type of `config/typescript.ts`. Resolved contract: `ResolvedConfig.TypeScript` in `@strapi/core`.
 */
export interface TypeScript {
  /**
   * When unset or `true`, Strapi generates TypeScript definitions during `strapi develop`
   * for JavaScript projects without a `tsconfig.json`.
   *
   * Set to `false` to disable autogeneration.
   */
  autogenerate?: boolean;

  /**
   * When `true`, `strapi develop` and `strapi ts:generate-types` also generate the application
   * level contracts and the opt-in to the strict core contracts.
   *
   * Unset or `false` keeps the previous behaviour.
   * Enabled by default in projects created with `create-strapi-app`.
   */
  strictTypes?: boolean;

  /**
   * The license features the application builds against, read by type generation with
   * `strictTypes`. Contracts gated by a listed feature are typed as registered, the others as
   * `undefined`. `'licensed'` stands for any license, e.g. one with no feature: every listed
   * feature implies it. Unset lists none.
   *
   * List the features of the license the application boots with (`STRAPI_LICENSE` or
   * `license.txt`): the types cannot check it, and a listed feature that the license lacks leaves
   * its contracts `undefined` at runtime. Ignored without `strictTypes`.
   */
  licensedFeatures?: Array<LicenseFeatureName | 'licensed'>;
}
