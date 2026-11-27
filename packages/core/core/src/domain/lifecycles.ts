import _ from 'lodash';
import { yup } from '@strapi/utils';

/**
 * Database lifecycle hooks a content-type or a component can declare.
 */
export const LIFECYCLES = [
  'beforeCreate',
  'afterCreate',
  'beforeFindOne',
  'afterFindOne',
  'beforeFindMany',
  'afterFindMany',
  'beforeCount',
  'afterCount',
  'beforeCreateMany',
  'afterCreateMany',
  'beforeUpdate',
  'afterUpdate',
  'beforeUpdateMany',
  'afterUpdateMany',
  'beforeDelete',
  'afterDelete',
  'beforeDeleteMany',
  'afterDeleteMany',
] as const;

export type Lifecycle = (typeof LIFECYCLES)[number];

export const lifecyclesShape = _.mapValues(_.keyBy(LIFECYCLES), () =>
  yup.mixed().nullable().isFunction()
);
