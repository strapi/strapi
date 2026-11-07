import type { Core, Schema, Struct } from '../../src';

interface LegacyItemSchema extends Struct.CollectionTypeSchema {
  attributes: { title: Schema.Attribute.String };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      // A declared license scope listing one feature: lookups stay permissive without strict types.
      interface Settings {
        licenses: 'declared';
      }
      interface LicensedFeatures {
        'review-workflows': true;
      }
      interface PackageServices {
        'plugin::legacy.example': { count(): number };
        'plugin::legacy.licensed': Core.Licensed<'review-workflows', { count(): number }>;
        'plugin::legacy.unlicensed': Core.Licensed<'cms-content-releases', { count(): number }>;
      }
      interface AppServices {
        'plugin::legacy.example': { count(): string };
        'api::legacy.example': { count(): string };
        'api::legacy.inferred': { count(): string };
      }
      interface InferredServices {
        'api::legacy.inferred': true;
      }
      interface PackageControllers {
        'plugin::legacy.example': { list: Core.ControllerHandler };
        'plugin::legacy.licensed': Core.Licensed<
          'review-workflows',
          { list: Core.ControllerHandler }
        >;
      }
      interface AppControllers {
        'plugin::legacy.example': { find: Core.ControllerHandler };
        'api::legacy.example': { find: Core.ControllerHandler };
        'api::legacy.inferred': { find: Core.ControllerHandler };
      }
      interface InferredControllers {
        'api::legacy.inferred': true;
      }
      interface Stores {
        plugin_legacy_settings: { enabled: boolean };
      }
      interface Events {
        'legacy.event': [{ id: number }];
      }
      interface PermissionActions {
        'plugin::legacy.items.read': true;
      }
      interface PackageConfigs {
        'plugin::legacy': { enabled: boolean };
      }
      interface AppConfigs {
        'plugin::legacy': { enabled: string };
      }
      interface PackagePolicies {
        'plugin::legacy.hasRole': { role: string };
        'api::legacy.hasRole': { apiRole: string };
      }
      interface AppPolicies {
        'plugin::legacy.hasRole': { roles: string[] };
      }
      interface PackageMiddlewares {
        'plugin::legacy.timer': { ms: number };
        'api::legacy.audit': { channel: string };
      }
      interface AppMiddlewares {
        'plugin::legacy.timer': { seconds: number };
      }
      interface PackageContentTypeSchemas {
        'plugin::legacy.item': LegacyItemSchema;
      }
      interface AppContentTypeSchemas {
        'api::strict-only.page': Struct.SingleTypeSchema;
      }
      // Attributes of a listed gate: schemas keep develop's types without strict types.
      interface LicensedContentTypeAttributes {
        'review-workflows': {
          attributes: { strapi_stage: Schema.Attribute.Relation<'oneToOne', 'admin::user'> };
          except: never;
        };
      }
      interface ComponentSchemas {
        'strict-only.seo': Struct.ComponentSchema;
      }
    }
  }
}
