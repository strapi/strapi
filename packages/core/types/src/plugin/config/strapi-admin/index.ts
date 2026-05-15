// TODO
// Interface for the plugin strapi-admin file

/** Mirrors `ImportLocaleJson` in `@strapi/admin` so plugins type-check against what `StrapiApp` passes at runtime. */
export type AdminImportLocaleJson = (
  locale: string,
  importJson: (code: string) => Promise<{ default: Record<string, string> }>
) => Promise<Record<string, string>>;

export interface AdminInput {
  register: unknown;
  bootstrap?: unknown;
  registerTrads?: (args: {
    locales: string[];
    importLocaleJson: AdminImportLocaleJson;
  }) => Promise<unknown>;
}
