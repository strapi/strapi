import type { Core } from '@strapi/types';
import type * as Controllers from './controllers';
import type * as Services from './services';
import type { HasPermissionsConfig } from './policies';
import type { Configuration } from '../../../shared/contracts/content-types';

export type * as Controllers from './controllers';
export type * as Services from './services';
export type * as Policies from './policies';

/** Default contracts loaded with the Content Manager server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * The edit and list view configurations, one row per content type or component UID
       * (`configuration_<content_types|components>::<uid>` in the `content_manager` store). They are
       * synced with the schemas at every start. Component rows also record `isComponent`.
       */
      interface Stores {
        [key: `plugin_content_manager_configuration_content_types::${string}`]: Configuration;
        [key: `plugin_content_manager_configuration_components::${string}`]: Configuration & {
          isComponent: boolean;
        };
      }

      interface PackageServices {
        'plugin::content-manager.components': Services.ComponentsService;
        'plugin::content-manager.content-structure': Services.ContentStructureService;
        'plugin::content-manager.content-types': Services.ContentTypesService;
        'plugin::content-manager.data-mapper': Services.DataMapperService;
        // Registered only when the `cms-content-history` feature is enabled: `undefined` unless
        // the application lists the feature in `licensedFeatures`, `T | undefined` in package and
        // plugin programs.
        'plugin::content-manager.history': Core.Licensed<
          'cms-content-history',
          Services.HistoryService
        >;
        'plugin::content-manager.homepage': Services.HomepageService;
        // Registered with `history`, under the same feature.
        'plugin::content-manager.lifecycles': Core.Licensed<
          'cms-content-history',
          Services.LifecyclesService
        >;
        'plugin::content-manager.permission': Services.PermissionService;
        'plugin::content-manager.permission-checker': Services.PermissionCheckerService;
        'plugin::content-manager.preview': Services.PreviewService;
        'plugin::content-manager.preview-config': Services.PreviewConfigService;
        'plugin::content-manager.document-manager': Services.DocumentManagerService;
        'plugin::content-manager.document-metadata': Services.DocumentMetadataService;
        'plugin::content-manager.field-sizes': Services.FieldSizesService;
        'plugin::content-manager.metrics': Services.MetricsService;
        'plugin::content-manager.populate-builder': Services.PopulateBuilderService;
        'plugin::content-manager.uid': Services.UIDService;
      }

      interface PackageControllers {
        'plugin::content-manager.collection-types': Controllers.CollectionTypesController;
        'plugin::content-manager.components': Controllers.ComponentsController;
        'plugin::content-manager.content-types': Controllers.ContentTypesController;
        // Registered with the history services, under the same feature.
        'plugin::content-manager.history-version': Core.Licensed<
          'cms-content-history',
          Controllers.HistoryVersionController
        >;
        'plugin::content-manager.homepage': Controllers.HomepageController;
        'plugin::content-manager.init': Controllers.InitController;
        'plugin::content-manager.preview': Controllers.PreviewController;
        'plugin::content-manager.relations': Controllers.RelationsController;
        'plugin::content-manager.single-types': Controllers.SingleTypesController;
        'plugin::content-manager.uid': Controllers.UIDController;
      }

      interface PackagePolicies {
        'plugin::content-manager.hasPermissions': HasPermissionsConfig | undefined;
      }

      /**
       * Registered at bootstrap (`services/permission.ts`). The `explorer.*` actions apply to the
       * content types, read at bootstrap.
       */
      interface PermissionActions {
        'plugin::content-manager.explorer.create': true;
        'plugin::content-manager.explorer.read': true;
        'plugin::content-manager.explorer.update': true;
        'plugin::content-manager.explorer.delete': true;
        'plugin::content-manager.explorer.publish': true;
        'plugin::content-manager.single-types.configure-view': true;
        'plugin::content-manager.collection-types.configure-view': true;
        'plugin::content-manager.components.configure-layout': true;
      }
    }
  }
}
