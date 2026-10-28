import type { Core } from '@strapi/strapi';
import type { Controllers, Services } from '@strapi/content-manager/strapi-server';
import type {
  Controllers as ReleasesControllers,
  Services as ReleasesServices,
} from '@strapi/content-releases/strapi-server';
import type { StagesController, WorkflowsService } from '@strapi/review-workflows/strapi-server';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const app: Core.Strapi;

// Strict types without the type generation marker: the license is unknown, so the bundled gated
// contracts may be undefined.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'unknown'>>,
  Core.Assert<
    Equal<Core.ServiceFor<'plugin::review-workflows.workflows'>, WorkflowsService | undefined>
  >,
  Core.Assert<
    Equal<Core.ControllerFor<'plugin::review-workflows.stages'>, StagesController | undefined>
  >,
  Core.Assert<
    Equal<
      Core.ServiceFor<'plugin::content-releases.release'>,
      ReleasesServices['release'] | undefined
    >
  >,
  Core.Assert<
    Equal<
      Core.ControllerFor<'plugin::content-releases.release'>,
      ReleasesControllers['release'] | undefined
    >
  >,
  Core.Assert<
    Equal<Core.ServiceFor<'plugin::content-manager.history'>, Services.HistoryService | undefined>
  >,
  Core.Assert<
    Equal<
      Core.ServiceFor<'plugin::content-manager.lifecycles'>,
      Services.LifecyclesService | undefined
    >
  >,
  Core.Assert<
    Equal<
      Core.ControllerFor<'plugin::content-manager.history-version'>,
      Controllers.HistoryVersionController | undefined
    >
  >,
];
checks satisfies unknown;

// @ts-expect-error The service may be undefined.
app.plugin('review-workflows').service('workflows').getAssignedWorkflow satisfies unknown;
