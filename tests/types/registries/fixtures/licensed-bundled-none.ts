import type { Core } from '@strapi/strapi';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const app: Core.Strapi;

// Type generation without `typescript.licensedFeatures`: the bundled gated contracts are missing.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'declared'>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::review-workflows.workflows'>, undefined>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::review-workflows.stages'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::content-releases.release'>, undefined>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::content-releases.release'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::content-manager.history'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::content-manager.lifecycles'>, undefined>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::content-manager.history-version'>, undefined>>,
];
checks satisfies unknown;

// @ts-expect-error The contract is `undefined`: the member does not exist on type 'never'.
app.plugin('review-workflows').service('workflows')?.getAssignedWorkflow satisfies unknown;
