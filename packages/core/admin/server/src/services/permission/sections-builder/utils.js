'use strict';

const { curry, matchesProperty, pick } = require('lodash/fp');

const isOfKind = (kind) => matchesProperty('kind', kind);

const resolveContentType = (uid) => strapi.contentTypes[uid];

const isNotInSubjects = (subjects) => (uid) => !subjects.find((subject) => subject.uid === uid);

const hasProperty = curry((property, subject) => {
  return !!subject.properties.find((prop) => prop.value === property);
});

const getValidOptions = pick(['applyToProperties']);

const toSubjectTemplate = (ct) => ({ uid: ct.uid, label: ct.info.singularName, properties: [] });

module.exports = {
  isOfKind,
  resolveContentType,
  isNotInSubjects,
  hasProperty,
  getValidOptions,
  toSubjectTemplate,
};
