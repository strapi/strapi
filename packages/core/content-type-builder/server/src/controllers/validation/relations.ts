import { isUndefined } from 'lodash/fp';
import { yup } from '@strapi/utils';
import type { TestContext, TestFunction } from 'yup';
import type { Schema, UID } from '@strapi/types';
import { typeKinds, coreUids } from '../../services/constants';
import { isValidName } from './common';

const STRAPI_USER_RELATIONS = ['oneToOne', 'oneToMany'];

const isValidRelation = (validNatures: ReadonlyArray<string>): TestFunction<string | undefined> =>
  function (this: TestContext, value) {
    // NOTE: In case of an undefined value, delegate the check to .required()
    if (value === undefined) {
      return true;
    }

    if (this.parent.target === coreUids.STRAPI_USER) {
      if (!validNatures.includes(value) || !isUndefined(this.parent.targetAttribute)) {
        return this.createError({
          path: this.path,
          message: `must be one of the following values: ${STRAPI_USER_RELATIONS.join(', ')}`,
        });
      }
    }

    return validNatures.includes(value)
      ? true
      : this.createError({
          path: this.path,
          message: `must be one of the following values: ${validNatures.join(', ')}`,
        });
  };

export const getRelationValidator = (
  attribute: Schema.Attribute.Relation,
  allowedRelations: ReadonlyArray<string>
) => {
  const contentTypesUIDs = Object.keys(strapi.contentTypes)
    .filter((key) => strapi.contentTypes[key as UID.ContentType].kind === typeKinds.COLLECTION_TYPE)
    .filter((key) => !key.startsWith(coreUids.PREFIX) || key === coreUids.STRAPI_USER)
    .concat(['__self__', '__contentType__']);

  const base = {
    type: yup.string().oneOf(['relation']).required(),
    relation: yup.string().test('isValidRelation', isValidRelation(allowedRelations)).required(),
    configurable: yup.boolean().nullable(),
    private: yup.boolean().nullable(),
    pluginOptions: yup.object(),
  };

  switch (attribute.relation) {
    case 'oneToOne':
    case 'oneToMany':
    case 'manyToOne':
    case 'manyToMany':
    case 'morphOne':
    case 'morphMany': {
      return yup.object({
        ...base,
        target: yup.string().oneOf(contentTypesUIDs).required(),
        targetAttribute: yup.string().test(isValidName).nullable(),
      });
    }
    case 'morphToOne':
    case 'morphToMany':
    default: {
      return yup.object({ ...base });
    }
  }
};
