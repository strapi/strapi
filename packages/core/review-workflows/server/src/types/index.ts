import type { Core } from '@strapi/types';
import type { Controllers } from './controllers';
import type {
  AssigneesService,
  DocumentServiceMiddlewaresService,
  HomepageService,
  StagePermissionsService,
  StagesService,
  ValidationService,
  WorkflowMetricsService,
  WorkflowWeeklyMetricsService,
  WorkflowsService,
} from './services';

export type * from './controllers';
export type * from './services';

/** A stage in the `review-workflows.updateEntryStage` event. */
type StageEvent = { id: number | string; name: string };

/** Review Workflows services by name, as registered by the plugin. */
export type Services = {
  assignees: AssigneesService;
  'document-service-middlewares': DocumentServiceMiddlewaresService;
  homepage: HomepageService;
  'stage-permissions': StagePermissionsService;
  stages: StagesService;
  validation: ValidationService;
  'workflow-metrics': WorkflowMetricsService;
  'workflow-weekly-metrics': WorkflowWeeklyMetricsService;
  workflows: WorkflowsService;
};

/**
 * Default contracts loaded with the Review Workflows server types.
 * The services are only registered when the `review-workflows` EE feature is enabled.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * The schedule of the weekly metrics cron, stored under the `ee` plugin name. Both members are
       * missing until the cron first runs. `lastWeeklyUpdate` is a timestamp in milliseconds.
       */
      interface Stores {
        plugin_ee_metrics: { lastWeeklyUpdate?: number; weeklySchedule?: string };
      }

      /**
       * The stage change of an entry, emitted by the Document Service middleware after an update
       * that moved the entry to another stage, and forwarded to webhooks. The payload names the entry
       * `entity` (not `entry`, unlike the `entry.*` events). IDs are database IDs, `uid` the content
       * type UID (a plain `string`: narrowing it to `UID.ContentType` would narrow a published type).
       */
      interface Events {
        'review-workflows.updateEntryStage': [
          {
            model: string;
            uid: string;
            entity: {
              id: number | string;
              documentId: string;
              /** `null` for a content type that is not localized. */
              locale: string | null;
              status: 'draft';
            };
            workflow: { id: number | string; stages: { from: StageEvent; to: StageEvent } };
          },
        ];
      }

      // Registered only when the `review-workflows` EE feature is enabled: `undefined` unless the
      // application lists the feature in `licensedFeatures`, `T | undefined` in package and plugin
      // programs.
      interface PackageServices {
        'plugin::review-workflows.assignees': Core.Licensed<
          'review-workflows',
          Services['assignees']
        >;
        'plugin::review-workflows.document-service-middlewares': Core.Licensed<
          'review-workflows',
          Services['document-service-middlewares']
        >;
        'plugin::review-workflows.homepage': Core.Licensed<
          'review-workflows',
          Services['homepage']
        >;
        'plugin::review-workflows.stage-permissions': Core.Licensed<
          'review-workflows',
          Services['stage-permissions']
        >;
        'plugin::review-workflows.stages': Core.Licensed<'review-workflows', Services['stages']>;
        'plugin::review-workflows.validation': Core.Licensed<
          'review-workflows',
          Services['validation']
        >;
        'plugin::review-workflows.workflow-metrics': Core.Licensed<
          'review-workflows',
          Services['workflow-metrics']
        >;
        'plugin::review-workflows.workflow-weekly-metrics': Core.Licensed<
          'review-workflows',
          Services['workflow-weekly-metrics']
        >;
        'plugin::review-workflows.workflows': Core.Licensed<
          'review-workflows',
          Services['workflows']
        >;
      }

      // Registered with the services, under the same feature.
      interface PackageControllers {
        'plugin::review-workflows.assignees': Core.Licensed<
          'review-workflows',
          Controllers['assignees']
        >;
        'plugin::review-workflows.homepage': Core.Licensed<
          'review-workflows',
          Controllers['homepage']
        >;
        'plugin::review-workflows.stages': Core.Licensed<'review-workflows', Controllers['stages']>;
        'plugin::review-workflows.workflows': Core.Licensed<
          'review-workflows',
          Controllers['workflows']
        >;
      }

      /**
       * Registered at bootstrap (`config/actions.ts`) under the `admin` plugin name, only when the
       * `review-workflows` EE feature is enabled: without it, these IDs are absent at runtime.
       */
      interface PermissionActions {
        'admin::review-workflows.create': true;
        'admin::review-workflows.read': true;
        'admin::review-workflows.update': true;
        'admin::review-workflows.delete': true;
        'admin::review-workflows.stage.transition': true;
      }
    }
  }
}
