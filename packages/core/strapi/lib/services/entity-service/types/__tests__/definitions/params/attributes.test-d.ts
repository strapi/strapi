import { EntityService } from '@strapi/strapi';
import '../content-types.test-d';

// TODO: When strapi/strapi is converted to typescript, the tsconfig will need to ignore all test-types.ts and test-d.ts files

type NonFilterableKindResolvesToPasswordOrDynamicZone =
  EntityService.Params.Attribute.NonFilterableKind;

type FilterableKindResolvesToValidFilterableKind = EntityService.Params.Attribute.FilterableKind;

// TODO: add some non-filterable keys
// type NonFilterableKeysResolves =
//   EntityService.Params.Attribute.GetNonFilterableKeys<'api::foo.foo'>;

type GetScalarKeysResolves = EntityService.Params.Attribute.GetScalarKeys<'api::foo.foo'>;

type GetNestedKeysResolves = EntityService.Params.Attribute.GetNestedKeys<'api::foo.foo'>;

type GetValuesResolves = EntityService.Params.Attribute.GetValues<'api::foo.foo'>;

// TODO: add a relation without target
// type OmitRelationWithoutTargetResolves = EntityService.Params.Attribute.OmitRelationWithoutTarget<
//   'api::foo.foo',
//   EntityService.Params.Attribute.GetValues<'api::foo.foo'>
// >;

// TODO: how is GetValue tested?

export {
  NonFilterableKindResolvesToPasswordOrDynamicZone,
  FilterableKindResolvesToValidFilterableKind,
  // NonFilterableKeysResolves,
  GetScalarKeysResolves,
  GetNestedKeysResolves,
  GetValuesResolves,
  // OmitRelationWithoutTargetResolves,
  // GetValueResolves
};
