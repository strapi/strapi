/* eslint-disable no-confusing-arrow */

import type { Schema } from '@strapi/types';

const shouldPluralizeName = (nature: Schema.Attribute.RelationKind.Any) =>
  ['manyToMany', 'oneToMany', 'manyWay'].includes(nature) ? 2 : 1;

const shouldPluralizeTargetAttribute = (nature: Schema.Attribute.RelationKind.Any) =>
  ['manyToMany', 'manyToOne'].includes(nature) ? 2 : 1;

export { shouldPluralizeName, shouldPluralizeTargetAttribute };
