import type { Core } from '@strapi/types';

import { mapValues } from 'lodash/fp';
import andOperator from './and';
import orOperator from './or';
import notOperator from './not';
import eqOperator from './eq';
import eqiOperator from './eqi';
import neOperator from './ne';
import neiOperator from './nei';
import startsWithOperator from './starts-with';
import endsWithOperator from './ends-with';
import containsOperator from './contains';
import notContainsOperator from './not-contains';
import containsiOperator from './containsi';
import notContainsiOperator from './not-containsi';
import gtOperator from './gt';
import gteOperator from './gte';
import ltOperator from './lt';
import lteOperator from './lte';
import nullOperator from './null';
import notNullOperator from './not-null';
import inOperator from './in';
import notInOperator from './not-in';
import betweenOperator from './between';

const operators = {
  and: andOperator,
  or: orOperator,
  not: notOperator,
  eq: eqOperator,
  eqi: eqiOperator,
  ne: neOperator,
  nei: neiOperator,
  startsWith: startsWithOperator,
  endsWith: endsWithOperator,
  contains: containsOperator,
  notContains: notContainsOperator,
  containsi: containsiOperator,
  notContainsi: notContainsiOperator,
  gt: gtOperator,
  gte: gteOperator,
  lt: ltOperator,
  lte: lteOperator,
  null: nullOperator,
  notNull: notNullOperator,
  in: inOperator,
  notIn: notInOperator,
  between: betweenOperator,
};

// Instantiate every operator with the Strapi instance
export default ({ strapi }: { strapi: Core.Strapi }) =>
  mapValues((opCtor) => opCtor({ strapi }), operators);
