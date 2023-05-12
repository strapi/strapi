import { shared } from '.';
import { AdminNamespace, ApiNamespace, ParseUID, RegistryKeysBy, RegistryQuery } from './core';

declare module '@strapi/strapi' {
  export module shared {
    export interface Services {
      'api::foo.bar': {
        foo: () => {};
      };
      'api::foo.baz': {
        baz: () => {};
      };
      'api::bar.foo': {
        fn(): number;
      };
      'api::bar.baz': {
        fn2(): number;
      };
      'strapi::bar': {
        method(): string;
      };
      'foo::bar': {};
      'plugin::bar.foo': {};
      'admin::permissions': {};
      'admin::user': {
        create(): void;
        delete(): Promise<string>;
      };
    }
  }
}

type AdminServices = RemoveNamespace<RegistryQuery<shared.Services, { namespace: AdminNamespace }>>;

type RemoveNamespace<T> = { [uid in RegistryKeysBy<T> as ParseUID<uid>['name']]: T[uid] };

declare const adminServices: AdminServices;

type FooServices = RemoveNamespace<
  RegistryQuery<shared.Services, { namespace: ApiNamespace<'foo'> }>
>;
declare const fooServices: FooServices;

type ParseAPI<T, A extends string> = RegistryQuery<
  T,
  { namespace: ApiNamespace<A> }
> extends infer S
  ? {
      [uid in RegistryKeysBy<S> as ParseUID<uid>['name']]: S[uid];
    }
  : never;

// declare const services: BuildRegistryTree<shared.Services, 'foo'>;
// services.bar.foo();
// services.baz.baz();

type MapParse<T> = { [uid in RegistryKeysBy<T>]: ParseUID<uid> };

// // Pick uid:value pairs based on the given query (following the ParsedUID format)
// type PickByQuery<T, Q extends Partial<ParsedUID>> = {
//   [uid in RegistryKeysBy<T> as ParseUID<uid> extends Q ? uid : never]: T[uid];
// };

// type GroupByApiName<T, A extends string> = {
//   [name in A]: PickByQuery<T, { namespace: `api::${name}` }> extends infer G
//     ? { [uid in RegistryKeysBy<G> as ParseUID<uid>['name']]: G[uid] }
//     : never;
// };

// interface API<T extends string> {
//   services: PickByQuery<Services, { namespace: `api::${T}` }>;
// }

// type TrimNamespaces<T> = { [uid in RegistryKeysBy<T> as ParseUID<uid>['name']]: T[uid] };

// type P = { [uid in RegistryKeysBy<Services>]: ParseUID<uid> };
// type AdminServices = TrimNamespaces<PickByQuery<Services, { namespace: AdminNamespace }>>;
// declare const adminServices: AdminServices;

// // Extract internal service for the main Services registry (uid -> service)
// type InternalServices = PickByQuery<Services, { namespace: AdminNamespace }>;
// const internalServices = {} as InternalServices;
