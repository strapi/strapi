import { resolvers } from 'graphql-scalars';
import { GraphQLUpload } from 'graphql-upload';

import TimeScalar from './time';
import GraphQLDate from './date';
import { builder } from '../../builders/pothosBuilder';

const { JSON, DateTime, BigInt } = resolvers;

export default () => ({
  JSON: builder.addScalarType('JSON', JSON, {}),
  DateTime: builder.addScalarType('DateTime', DateTime, {}),
  Time: builder.addScalarType('Time', TimeScalar, {}),
  Date: builder.addScalarType('Date', GraphQLDate, {}),
  Long: builder.addScalarType('Long', BigInt, {}),
  Upload: builder.addScalarType('Upload', GraphQLUpload as any, {}),
});
