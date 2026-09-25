import type * as Controllers from './controllers';
import type * as Services from './services';
import type { HasPermissionsConfig } from './policies';

export type * as Controllers from './controllers';
export type * as Services from './services';
export type * as Policies from './policies';

/** Default contracts loaded with the Content Manager server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::content-manager.components': Services.ComponentsService;
        'plugin::content-manager.content-structure': Services.ContentStructureService;
        'plugin::content-manager.content-types': Services.ContentTypesService;
        'plugin::content-manager.data-mapper': Services.DataMapperService;
        'plugin::content-manager.history': Services.HistoryService;
        'plugin::content-manager.homepage': Services.HomepageService;
        'plugin::content-manager.lifecycles': Services.LifecyclesService;
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
        'plugin::content-manager.init': Controllers.InitController;
        'plugin::content-manager.relations': Controllers.RelationsController;
        'plugin::content-manager.single-types': Controllers.SingleTypesController;
        'plugin::content-manager.uid': Controllers.UIDController;
      }

      interface PackagePolicies {
        'plugin::content-manager.hasPermissions': HasPermissionsConfig | undefined;
      }
    }
  }
}
