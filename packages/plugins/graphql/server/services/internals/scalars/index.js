'use strict';

const GraphQLJSON = require('graphql-type-json');
const GraphQLLong = require('graphql-type-long');
const { GraphQLUpload } = require('graphql-upload');
const { asNexusMethod } = require('nexus');

const DateScalar = require('./date');
const DateTimeScalar = require('./datetime');
const TimeScalar = require('./time');

module.exports = () => ({
  JSON: asNexusMethod(GraphQLJSON, 'json'),
  DateTime: asNexusMethod(DateTimeScalar, 'dateTime'),
  Time: asNexusMethod(TimeScalar, 'time'),
  Date: asNexusMethod(DateScalar, 'date'),
  Long: asNexusMethod(GraphQLLong, 'long'),
  Upload: asNexusMethod(GraphQLUpload, 'upload'),
});
