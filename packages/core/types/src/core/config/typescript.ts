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
   * service contracts (`types/generated/services.d.ts`) and the opt-in to the contracts of the
   * plugins bundled with Strapi (`types/generated/plugins.d.ts`), so service lookups such as
   * `strapi.service('api::article.article')` are type-checked.
   *
   * Unset or `false` keeps the previous behaviour and removes those two files if a previous run
   * generated them. Enabled by default in projects created with `create-strapi-app`.
   */
  strictTypes?: boolean;
}
