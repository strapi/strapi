/**
 * Type-level drift tests between the values `@strapi/core` adds to the container and their contracts
 * in `@strapi/types` (`core/container-contracts.ts`), compiled by `yarn test:ts` (tsc -p
 * tsconfig.json, strict types on) and excluded from the build. Each implementation must be
 * assignable to its contract and have exactly its members.
 */
import type { Core, Modules } from '@strapi/types';

import type createQueryParamService from '../services/query-params';
import type { createContentSourceMapsService } from '../services/content-source-maps';
import type { createContentStructureService } from '../services/content-structure';
import type contentTypesRegistry from '../registries/content-types';
import type componentsRegistry from '../registries/components';
import type servicesRegistry from '../registries/services';
import type controllersRegistry from '../registries/controllers';
import type policiesRegistry from '../registries/policies';
import type middlewaresRegistry from '../registries/middlewares';
import type modulesRegistry from '../registries/modules';
import type pluginsRegistry from '../registries/plugins';
import type customFieldsRegistry from '../registries/custom-fields';
import type apisRegistry from '../registries/apis';
import type { registry as modelsRegistry } from '../registries/models';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

/**
 * `true` when the implementation is assignable to the contract and has the same members; otherwise
 * the drift, for {@link Core.Assert} to name it.
 */
type Ties<TImplementation, TContract> = [TImplementation] extends [TContract]
  ? Core.SameNames<keyof TImplementation, keyof TContract>
  : { notAssignableTo: TContract };

type QueryParams = ReturnType<typeof createQueryParamService>;
type ContentTypes = ReturnType<typeof contentTypesRegistry>;
type CustomFields = ReturnType<typeof customFieldsRegistry>;
type Policies = ReturnType<typeof policiesRegistry>;

export type ContainerContractTies = [
  Core.Assert<Ties<QueryParams, Core.QueryParamsService>>,
  Core.Assert<
    Ties<ReturnType<typeof createContentSourceMapsService>, Core.ContentSourceMapsService>
  >,
  Core.Assert<Ties<ReturnType<typeof createContentStructureService>, Core.ContentStructureService>>,
  Core.Assert<Ties<ContentTypes, Core.ContentTypesRegistry>>,
  Core.Assert<Ties<ReturnType<typeof componentsRegistry>, Core.ComponentsRegistry>>,
  Core.Assert<Ties<ReturnType<typeof servicesRegistry>, Core.ServicesRegistry>>,
  Core.Assert<Ties<ReturnType<typeof controllersRegistry>, Core.ControllersRegistry>>,
  Core.Assert<Ties<Policies, Core.PoliciesRegistry>>,
  Core.Assert<Ties<ReturnType<typeof middlewaresRegistry>, Core.MiddlewaresRegistry>>,
  Core.Assert<Ties<ReturnType<typeof modulesRegistry>, Core.ModulesRegistry>>,
  Core.Assert<Ties<ReturnType<ReturnType<typeof modulesRegistry>['get']>, Core.RegisteredModule>>,
  Core.Assert<Ties<ReturnType<typeof pluginsRegistry>, Core.PluginsRegistry>>,
  Core.Assert<Ties<CustomFields, Core.CustomFieldsRegistry>>,
  Core.Assert<Ties<ReturnType<typeof apisRegistry>, Core.ApisRegistry>>,
  Core.Assert<Ties<ReturnType<typeof modelsRegistry>, Core.ModelsRegistry>>,
];

// Method parameters are compared bivariantly, and results covariantly: the members whose
// implementation once declared another type than the runtime are pinned exactly.
export type ContainerContractPrecision = [
  // `get` throws when the custom field is missing and returns the options `add` stored.
  Expect<Equal<ReturnType<CustomFields['get']>, Modules.CustomFields.CustomFieldServerOptions>>,
  // `resolve` returns each policy's handler function, never the policy object.
  Expect<
    Equal<
      ReturnType<Policies['resolve']>[number]['handler'],
      ReturnType<Core.PoliciesRegistry['resolve']>[number]['handler']
    >
  >,
];
