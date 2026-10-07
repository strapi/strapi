export interface TypeScript {
  /**
   * When unset or `true`, Strapi generates TypeScript definitions during `strapi develop`
   * for JavaScript projects without a `tsconfig.json`.
   *
   * Set to `false` to disable autogeneration.
   */
  autogenerate?: boolean;
  /**
   * Directory, relative to the app root, in which `strapi develop` generates TypeScript definitions.
   * Definitions are written to `<outDir>/generated`, like the `--out-dir` option of `strapi ts:generate-types`.
   *
   * @default 'types'
   */
  outDir?: string;
}
