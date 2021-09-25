'use strict';

const GraphQLJSON = require('graphql-type-json');
const GraphQLLong = require('graphql-type-long');
const { GraphQLDateTime, GraphQLDate } = require('graphql-iso-date/dist');
const { GraphQLUpload } = require('graphql-upload');
const { asNexusMethod } = require('nexus');

const TimeScalar = require('./time');

module.exports = () => ({
  JSON: asNexusMethod(GraphQLJSON, 'json'),
  DateTime: asNexusMethod(GraphQLDateTime, 'dateTime'),
  Time: asNexusMethod(TimeScalar, 'time'),
  Date: asNexusMethod(GraphQLDate, 'date'),
  Long: asNexusMethod(GraphQLLong, 'long'),
  Upload: asNexusMethod(GraphQLUpload, 'upload'),
});
