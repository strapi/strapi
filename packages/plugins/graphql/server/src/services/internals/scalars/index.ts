import { GraphQLDateTime, GraphQLLong, GraphQLJSON } from 'graphql-scalars';
import { asNexusMethod } from 'nexus';

import TimeScalar from './time';
import GraphQLDate from './date';

export default () => ({
  JSON: asNexusMethod(GraphQLJSON, 'json'),
  DateTime: asNexusMethod(GraphQLDateTime, 'dateTime'),
  Time: asNexusMethod(TimeScalar, 'time'),
  Date: asNexusMethod(GraphQLDate, 'date'),
  Long: asNexusMethod(GraphQLLong, 'long'),
});
