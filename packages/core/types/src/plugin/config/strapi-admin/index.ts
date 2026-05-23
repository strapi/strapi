// TODO
// Interface for the plugin strapi-admin file

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
