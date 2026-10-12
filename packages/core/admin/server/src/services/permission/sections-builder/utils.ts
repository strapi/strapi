import { pick, curry, matchesProperty } from 'lodash';

import type { Internal, Struct } from '@strapi/types';

const isOfKind = (kind: unknown) => matchesProperty('kind', kind);

const resolveContentType = (uid: Internal.UID.ContentType): Struct.ContentTypeSchema => {
  return strapi.contentTypes[uid];
};

const isNotInSubjects = (subjects: any) => (uid: unknown) =>
  !subjects.find((subject: any) => subject.uid === uid);

const hasProperty = curry((property: unknown, subject: any) => {
  return !!subject.properties.find((prop: any) => prop.value === property);
});

const getValidOptions = (options: object) => pick(options, ['applyToProperties']);

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
