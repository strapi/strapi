import type { Core, Schema } from '@strapi/strapi';

// A package whose contracts exist only with a license, gated the way review workflows
// (`review-workflows`), content releases (`cms-content-releases`) and the admin EE edition
// (`licensed`) gate theirs. With any license, it adds an attribute to every content type.
export type ReportsService = { count(): number };
export type ReleasesService = { publish(id: number): Promise<void> };
export type SeatsService = { getDisabledUserList(): Promise<number[]> };
export type CEUsersService = { create(): Promise<{ id: number }> };
export type EEUsersService = {
  create(): Promise<{ id: number; isSSOLocked: boolean }>;
  isSSOLocked(): boolean;
};
export type ReportsController = { find: Core.ControllerHandler };

declare global {
  namespace Strapi {
    namespace Registries {
      interface PackageServices {
        'plugin::licensed-provider.reports': Core.Licensed<'review-workflows', ReportsService>;
        'plugin::licensed-provider.releases': Core.Licensed<
          'cms-content-releases',
          ReleasesService
        >;
        'plugin::licensed-provider.seats': Core.Licensed<'licensed', SeatsService>;
        'plugin::licensed-provider.users': Core.LicensedExtension<CEUsersService, EEUsersService>;
      }
      interface PackageControllers {
        'plugin::licensed-provider.reports': Core.Licensed<'review-workflows', ReportsController>;
      }
      interface LicensedContentTypeAttributes {
        licensed: { attributes: { licensed_note: Schema.Attribute.Text }; except: never };
      }
    }
  }
}
