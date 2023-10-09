import { curry, matchesProperty, pick } from 'lodash/fp';

const isOfKind = (kind: any) => matchesProperty('kind', kind);

const resolveContentType = (uid: any) => strapi.contentTypes[uid];

const isNotInSubjects = (subjects: any) => (uid: any) =>
  !subjects.find((subject: any) => subject.uid === uid);

const hasProperty = curry((property: any, subject: any) => {
  return !!subject.properties.find((prop: any) => prop.value === property);
});

const getValidOptions = pick(['applyToProperties']);

const toSubjectTemplate = (ct: any) => ({
  uid: ct.uid,
  label: ct.info.singularName,
  properties: [],
});

export {
  isOfKind,
  resolveContentType,
  isNotInSubjects,
  hasProperty,
  getValidOptions,
  toSubjectTemplate,
};
