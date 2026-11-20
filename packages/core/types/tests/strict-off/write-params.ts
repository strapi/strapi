import type { Core, Modules, UID } from '../../src';
import type { Equal, Expect } from './helpers';

// Document Service write params keep develop's types: the write inputs are strict-only.
type Pick<
  TUID extends UID.ContentType,
  TKind extends Modules.Documents.Params.Kind,
> = Modules.Documents.Params.Pick<TUID, TKind>;
type WriteParams<TUID extends UID.ContentType> = Modules.Documents.ServiceParams<TUID>;
type DocumentId = { documentId: Modules.Documents.ID };
declare const writeParamChecks: [
  Expect<
    Equal<
      WriteParams<'api::strict-only.page'>['create'],
      Pick<
        'api::strict-only.page',
        'data' | 'fields' | 'populate' | 'locale:string' | 'lookup' | 'status'
      >
    >
  >,
  Expect<
    Equal<
      WriteParams<'api::strict-only.page'>['update'],
      Pick<
        'api::strict-only.page',
        'data:partial' | 'fields' | 'populate' | 'locale:string' | 'lookup'
      > &
        DocumentId
    >
  >,
  Expect<
    Equal<
      WriteParams<'api::strict-only.page'>['clone'],
      Pick<
        'api::strict-only.page',
        'data' | 'fields' | 'populate' | 'status' | 'locale:string' | 'lookup'
      > &
        DocumentId
    >
  >,
  Expect<
    Equal<
      WriteParams<UID.ContentType>['create'],
      Pick<UID.ContentType, 'data' | 'fields' | 'populate' | 'locale:string' | 'lookup' | 'status'>
    >
  >,
  // The core service's `create` keeps its loose data.
  Expect<
    Equal<
      Parameters<Core.CoreAPI.Service.CollectionType['create']>[0],
      { data: Record<string, unknown>; [key: string]: unknown }
    >
  >,
  // So do its `update` and `createOrUpdate`: their typed input is strict-only, and a registered UID
  // does not reach the strict services.
  Expect<Equal<Core.CoreAPI.Service.ContentType<'plugin::legacy.item'>, Core.CoreAPI.Service.Base>>,
  Expect<
    Equal<Core.CoreAPI.Service.ContentType<'api::strict-only.page'>, Core.CoreAPI.Service.Base>
  >,
  Expect<
    Equal<
      Parameters<Core.CoreAPI.Service.CollectionType['update']>[1],
      { data: Record<string, unknown>; [key: string]: unknown }
    >
  >,
  Expect<
    Equal<
      Parameters<Core.CoreAPI.Service.SingleType['createOrUpdate']>[0],
      { data: Record<string, unknown>; [key: string]: unknown }
    >
  >,
];
writeParamChecks satisfies unknown;
