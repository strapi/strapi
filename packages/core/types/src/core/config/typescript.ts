export interface TypeScript {
  /**
   * When unset or `true`, Strapi generates TypeScript definitions during `strapi develop`
   * for JavaScript projects without a `tsconfig.json`.
   *
   * Set to `false` to disable autogeneration.
   */
  autogenerate?: boolean;
}
