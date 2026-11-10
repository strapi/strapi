import type { Core, Modules, Schema, Struct, UID } from '../../src';
import type * as EngineParams from '../../src/modules/documents/params/document-engine';
import type { Equal, Expect } from './helpers';

// Document Service params keep develop's types.
type HasParam<TParams, TKey extends string> = TKey extends keyof TParams ? true : false;
type Documents = Modules.Documents.ServiceInstance<UID.ContentType>;
type FindManyParams = NonNullable<Parameters<Documents['findMany']>[0]>;
type CoreFind = Awaited<ReturnType<Core.CoreAPI.Service.CollectionType['find']>>;
type PublishParams = Parameters<Modules.Documents.DraftAndPublishExtension['publish']>[0];
declare const documentParamChecks: [
  // `update` takes no `status`.
  Expect<Equal<HasParam<Modules.Documents.ServiceParams['update'], 'status'>, false>>,
  // Methods take `lookup`.
  Expect<Equal<FindManyParams['lookup'], Record<string, unknown> | undefined>>,
  Expect<Equal<PublishParams['lookup'], Record<string, unknown> | undefined>>,
  // `clone` may resolve to `null`.
  Expect<Equal<null extends Awaited<ReturnType<Documents['clone']>> ? true : false, true>>,
  // The core service's `find` may resolve to `null` results, with no `total` in its pagination.
  Expect<Equal<CoreFind['results'], Modules.Documents.AnyDocument[] | null>>,
  Expect<Equal<HasParam<CoreFind['pagination'], 'total'>, false>>,
];
documentParamChecks satisfies unknown;

// Each method constraint is develop's engine params type. `service-instance.ts` wraps them under
// develop's `Params.<Method>` name, so the generic declarations print develop's constraint text.
type MethodParam<TMethod extends (...args: never[]) => unknown> = NonNullable<
  Parameters<TMethod>[0]
>;
type DraftAndPublish = Modules.Documents.DraftAndPublishExtension;
declare const methodConstraintChecks: [
  Expect<Equal<MethodParam<Documents['findMany']>, EngineParams.FindMany<UID.ContentType>>>,
  Expect<Equal<MethodParam<Documents['findFirst']>, EngineParams.FindFirst<UID.ContentType>>>,
  Expect<Equal<MethodParam<Documents['findOne']>, EngineParams.FindOne<UID.ContentType>>>,
  Expect<Equal<MethodParam<Documents['delete']>, EngineParams.Delete<UID.ContentType>>>,
  Expect<Equal<MethodParam<Documents['create']>, EngineParams.Create<UID.ContentType>>>,
  Expect<Equal<MethodParam<Documents['update']>, EngineParams.Update<UID.ContentType>>>,
  Expect<Equal<MethodParam<Documents['count']>, EngineParams.Count<UID.ContentType>>>,
  Expect<Equal<MethodParam<Documents['clone']>, EngineParams.Clone<UID.ContentType>>>,
  Expect<Equal<MethodParam<DraftAndPublish['publish']>, EngineParams.Publish<UID.ContentType>>>,
  Expect<Equal<MethodParam<DraftAndPublish['unpublish']>, EngineParams.Unpublish<UID.ContentType>>>,
  Expect<
    Equal<MethodParam<DraftAndPublish['discardDraft']>, EngineParams.DiscardDraft<UID.ContentType>>
  >,
];
methodConstraintChecks satisfies unknown;

// Populated attributes keep develop's `Result`: object populate keys set to `false` and `count`
// clauses are populated keys, as on develop. Strict results drop them (`document-populate.ts` in
// `tests/types/registries/fixtures`).
interface PopulateItem extends Struct.CollectionTypeSchema {
  info: { singularName: 'populate-item'; pluralName: 'populate-items'; displayName: 'Item' };
  attributes: {
    title: Schema.Attribute.String;
    tags: Schema.Attribute.Relation<'oneToMany', 'api::populate-tag.populate-tag'>;
    cover: Schema.Attribute.Media<'images'>;
  };
}
interface PopulateTag extends Struct.CollectionTypeSchema {
  info: { singularName: 'populate-tag'; pluralName: 'populate-tags'; displayName: 'Tag' };
  attributes: { name: Schema.Attribute.String };
}
declare module '../../src/public/registries' {
  export interface ContentTypeSchemas {
    'api::populate-item.populate-item': PopulateItem;
    'api::populate-tag.populate-tag': PopulateTag;
  }
}

declare const populateItems: Modules.Documents.ServiceInstance<'api::populate-item.populate-item'>;
declare const populateFlag: boolean;
type PopulateEntry<T> = Awaited<T> extends (infer TItem)[] ? TItem : never;
type LegacyTags = Modules.Documents.Result<
  'api::populate-item.populate-item',
  { populate: 'tags' }
>['tags'];
const populateFalse = populateItems.findMany({ populate: { tags: false } });
const populateDynamic = populateItems.findMany({ populate: { tags: populateFlag } });
const populateCount = populateItems.findMany({ populate: { tags: { count: true } } });
const populateMediaCount = populateItems.findMany({ populate: { cover: { count: true } } });
declare const populateChecks: [
  Expect<Equal<HasParam<PopulateEntry<typeof populateFalse>, 'tags'>, true>>,
  Expect<Equal<PopulateEntry<typeof populateFalse>['tags'], LegacyTags>>,
  Expect<Equal<PopulateEntry<typeof populateDynamic>['tags'], LegacyTags>>,
  Expect<Equal<PopulateEntry<typeof populateCount>['tags'], LegacyTags>>,
  Expect<Equal<HasParam<PopulateEntry<typeof populateMediaCount>, 'cover'>, true>>,
];
populateChecks satisfies unknown;
