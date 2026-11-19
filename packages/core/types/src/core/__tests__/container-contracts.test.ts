import type * as Core from '..';
import type * as Modules from '../../modules';
import type * as Struct from '../../struct';
import type { Equal, Expect } from '../../../tests/helpers/assert';

declare const contentTypes: Core.ContentTypesRegistry;
declare const services: Core.ServicesRegistry;
declare const policies: Core.PoliciesRegistry;
declare const customFields: Core.CustomFieldsRegistry;
declare const modules: Core.ModulesRegistry;
declare const auditLogsLifecycle: Modules.AuditLogs.AuditLogsLifecycleService;

type ResolvedHandler = ReturnType<Core.PoliciesRegistry['resolve']>[number]['handler'];

export type ContainerContractAssertions = [
  // `custom-fields.get` returns the options the custom field was registered with.
  Expect<
    Equal<
      ReturnType<Core.CustomFieldsRegistry['get']>,
      Modules.CustomFields.CustomFieldServerOptions
    >
  >,
  // `policies.resolve` resolves each policy to its handler function, never to the policy object.
  Expect<Equal<Extract<ResolvedHandler, { handler: unknown }>, never>>,
  Expect<ResolvedHandler extends Core.Policy ? true : false>,
  // Registry lookups of a missing name resolve to `undefined`.
  Expect<Equal<ReturnType<Core.ServicesRegistry['get']>, Core.Service | undefined>>,
  Expect<Equal<ReturnType<Core.RegisteredModule['service']>, Core.Service | undefined>>,
  Expect<Equal<ReturnType<Core.RegisteredModule['controller']>, Core.Controller | undefined>>,
];

export const containerContractCalls = () => {
  // Registry names are built at runtime from a namespace and a name.
  const namespace: string = 'plugin::lab';
  services.get(`${namespace}.reader`);
  contentTypes.get(`${namespace}.article`);

  // `content-types.extend` ignores the callback's result: the callback mutates the schema.
  contentTypes.extend('api::article.article', (contentType: Struct.ContentTypeSchema) => {
    contentType.options = { ...contentType.options, draftAndPublish: true };
  });

  // `custom-fields.get` throws when missing, so its result is the stored options.
  customFields.get('plugin::lab.color').type satisfies string;

  policies.resolve(
    ['global::is-authenticated', { name: 'plugin::lab.limit', config: { max: 1 } }],
    {
      pluginName: 'lab',
    }
  );

  // Modules are added from a raw module and read back loaded.
  modules.add('api::lab', { config: {} }).config('enabled') satisfies unknown;

  // A package registers an event with the arguments its `eventHub.emit()` passes.
  auditLogsLifecycle.registerEvent<{ name: string }>(
    'lab.update',
    (event: { name: string }) => ({ resource: { type: 'lab' }, details: { name: event.name } }),
    { action: 'lab.updated', shouldRecord: (event: { name: string }) => event.name !== '' }
  );
};
