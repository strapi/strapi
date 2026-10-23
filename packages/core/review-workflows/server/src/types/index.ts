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

      // Registered only when the `review-workflows` EE feature is enabled, so a CE application, or a
      // license without the feature, resolves them to `undefined`.
      // TODO @Nico Redesign as a real opt-in to licensed features, so applications that have the
      // feature can drop `undefined`, instead of every application seeing it.
      interface PackageServices {
        'plugin::review-workflows.assignees': Services['assignees'] | undefined;
        'plugin::review-workflows.document-service-middlewares':
          Services['document-service-middlewares'] | undefined;
        'plugin::review-workflows.homepage': Services['homepage'] | undefined;
        'plugin::review-workflows.stage-permissions': Services['stage-permissions'] | undefined;
        'plugin::review-workflows.stages': Services['stages'] | undefined;
        'plugin::review-workflows.validation': Services['validation'] | undefined;
        'plugin::review-workflows.workflow-metrics': Services['workflow-metrics'] | undefined;
        'plugin::review-workflows.workflow-weekly-metrics':
          Services['workflow-weekly-metrics'] | undefined;
        'plugin::review-workflows.workflows': Services['workflows'] | undefined;
      }

      // Registered with the services, under the same feature.
      interface PackageControllers {
        'plugin::review-workflows.assignees': Controllers['assignees'] | undefined;
        'plugin::review-workflows.homepage': Controllers['homepage'] | undefined;
        'plugin::review-workflows.stages': Controllers['stages'] | undefined;
        'plugin::review-workflows.workflows': Controllers['workflows'] | undefined;
      }
    }
  }
}
