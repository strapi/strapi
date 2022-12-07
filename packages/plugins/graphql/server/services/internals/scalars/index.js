'use strict';

const {
  resolvers: { JSON, DateTime, BigInt },
} = require('graphql-scalars');
const { GraphQLUpload } = require('graphql-upload');

const TimeScalar = require('./time');
const GraphQLDate = require('./date');
const { builder } = require('../../builders/pothosBuilder');

module.exports = () => ({
  JSON: builder.addScalarType('JSON', JSON, {}),
  DateTime: builder.addScalarType('DateTime', DateTime, {}),
  Time: builder.addScalarType('Time', TimeScalar, {}),
  Date: builder.addScalarType('Date', GraphQLDate, {}),
  Long: builder.addScalarType('Long', BigInt, {}),
  Upload: builder.addScalarType('Upload', GraphQLUpload, {}),
});
