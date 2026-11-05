import type { Core } from '@strapi/strapi';
import type { StagesController, WorkflowsService } from '@strapi/review-workflows/strapi-server';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const app: Core.Strapi;

// Type generation with `licensedFeatures: ['review-workflows']`: the review workflows contracts
// exist, the content releases and content history ones are missing.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'declared'>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::review-workflows.workflows'>, WorkflowsService>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::review-workflows.stages'>, StagesController>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::content-releases.release'>, undefined>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::content-releases.release'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::content-manager.history'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::content-manager.lifecycles'>, undefined>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::content-manager.history-version'>, undefined>>,
];
checks satisfies unknown;

app.plugin('review-workflows').service('workflows').getAssignedWorkflow satisfies (
  ...args: never[]
) => unknown;
// @ts-expect-error The feature is not listed: the contract is `undefined`.
app.plugin('content-releases').service('release').findPage satisfies unknown;
