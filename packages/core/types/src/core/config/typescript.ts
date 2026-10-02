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
}
