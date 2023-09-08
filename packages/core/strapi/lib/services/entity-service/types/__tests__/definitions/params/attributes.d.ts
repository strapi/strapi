import { EntityService } from '@strapi/strapi';

type NonFilterableKindResolvesToPasswordOrDynamicZone =
  EntityService.Params.Attribute.NonFilterableKind;

type FilterableKindResolvesToValidFilterableKind = EntityService.Params.Attribute.FilterableKind;

type GetNonFilterableKeys = EntityService.Params.Attribute.GetNonFilterableKeys;

/*
GetNonFilterableKeys
GetScalarKeys
GetNestedKeys
ID
*/

export {
  NonFilterableKindResolvesToPasswordOrDynamicZone,
  FilterableKindResolvesToValidFilterableKind,
  GetNonFilterableKeys,
};
