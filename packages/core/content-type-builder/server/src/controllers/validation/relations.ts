import { yup } from '@strapi/utils';
import type { TestContext, TestFunction } from 'yup';
import type { Schema, UID } from '@strapi/types';
import { typeKinds, coreUids } from '../../services/constants';
import { getRelationKindError } from '../../utils/relation-kinds';
import { isValidName } from './common';

const isValidRelation = (validNatures: ReadonlyArray<string>): TestFunction<string | undefined> =>
  function isValidRelationValue(this: TestContext, value) {
    // NOTE: In case of an undefined value, delegate the check to .required()
    if (value === undefined) {
      return true;
    }

    // A target can declare the relation kinds it accepts (`restrictRelationsTo`). The payload may
    // carry the counterpart as `targetAttribute` or, hand-written, as `inversedBy` / `mappedBy`.
    const kindError = getRelationKindError({ ...this.parent, relation: value });

    if (kindError !== null) {
      return this.createError({ path: this.path, message: kindError });
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
    required: yup.boolean(),
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
