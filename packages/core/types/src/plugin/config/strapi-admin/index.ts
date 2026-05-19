// TODO
// Interface for the plugin strapi-admin file

export interface AdminInput {
  register: unknown;
  bootstrap?: unknown;
  registerTrads?: (args: { locales: string[] }) => Promise<unknown>;
}
