/**
 * Entity validator
 * Module that will validate input data for entity creation or edition
 */

import { uniqBy, castArray, isNil, isArray, mergeWith } from 'lodash';
import { has, assoc, prop, isObject, isEmpty } from 'lodash/fp';
import strapiUtils from '@strapi/utils';
import * as validators from './validators';
import { Common, Schema, Attribute, UID } from '../../types';

type CreateOrUpdate = 'creation' | 'update';

const { yup, validateYupSchema } = strapiUtils;
const { isMediaAttribute, isScalarAttribute, getWritableAttributes } = strapiUtils.contentTypes;
const { ValidationError } = strapiUtils.errors;

type Entity = {
  id: string | number;
  [key: string]: unknown;
} | null;

type ID = { id: string | number };

type RelationSource = string | number | ID;

interface ValidatorMeta {
  attr: Attribute.Any;
  updatedAttribute: { name: string; value: unknown };
}

interface ValidatorContext {
  isDraft: boolean;
}

interface AttributeValidatorMetas {
  attr: Attribute.Any;
  updatedAttribute: { name: string; value: unknown };
  model: Schema.ContentType;
  entity?: Entity;
}

interface ModelValidatorMetas {
  model: Schema.ContentType;
  data: Record<string, unknown>;
  entity?: Entity;
}

const addMinMax = <
  T extends {
    min(value: number): T;
    max(value: number): T;
  }
>(
  validator: T,
  { attr, updatedAttribute }: ValidatorMeta
): T => {
  let nextValidator: T = validator;

  if (
    Number.isInteger(attr.min) &&
    (attr.required || (Array.isArray(updatedAttribute.value) && updatedAttribute.value.length > 0))
  ) {
    nextValidator = nextValidator.min(attr.min);
  }
  if (Number.isInteger(attr.max)) {
    nextValidator = nextValidator.max(attr.max);
  }
  return nextValidator;
};

const addRequiredValidation = (createOrUpdate: CreateOrUpdate) => {
  return <T extends strapiUtils.yup.AnySchema>(
    validator: T,
    { attr: { required } }: ValidatorMeta
  ): T => {
    let nextValidator = validator;
    if (required) {
      if (createOrUpdate === 'creation') {
        nextValidator = nextValidator.notNil();
      } else if (createOrUpdate === 'update') {
        nextValidator = nextValidator.notNull();
      }
    } else {
      nextValidator = nextValidator.nullable();
    }
    return nextValidator;
  };
};

const addDefault = (createOrUpdate: CreateOrUpdate) => {
  return (validator: strapiUtils.yup.BaseSchema, { attr }: ValidatorMeta) => {
    let nextValidator = validator;

    if (createOrUpdate === 'creation') {
      if (
        ((attr.type === 'component' && attr.repeatable) || attr.type === 'dynamiczone') &&
        !attr.required
      ) {
        nextValidator = nextValidator.default([]);
      } else {
        nextValidator = nextValidator.default(attr.default);
      }
    } else {
      nextValidator = nextValidator.default(undefined);
    }

    return nextValidator;
  };
};

const preventCast = (validator: strapiUtils.yup.AnySchema) =>
  validator.transform((val, originalVal) => originalVal);

const createComponentValidator =
  (createOrUpdate: CreateOrUpdate) =>
  ({ attr, updatedAttribute }: ValidatorMeta, { isDraft }: ValidatorContext) => {
    const model = strapi.getModel(attr.component);
    if (!model) {
      throw new Error('Validation failed: Model not found');
    }

    if (prop('repeatable', attr) === true) {
      // FIXME: yup v1

      let validator = yup
        .array()
        .of(
          yup.lazy((item) =>
            createModelValidator(createOrUpdate)({ model, data: item }, { isDraft }).notNull()
          ) as any
        );

      validator = addRequiredValidation(createOrUpdate)(validator, {
        attr: { required: true },
        updatedAttribute,
      });

      validator = addMinMax(validator, { attr, updatedAttribute });

      return validator;
    }

    // FIXME: v4 was broken
    let validator = yup.lazy((item) =>
      createModelValidator(createOrUpdate)({ model, data: item }, { isDraft })
    ) as any;

    validator = addRequiredValidation(createOrUpdate)(validator, {
      attr: { required: !isDraft && attr.required },
      updatedAttribute,
    });

    return validator;
  };

const createDzValidator =
  (createOrUpdate: CreateOrUpdate) =>
  ({ attr, updatedAttribute }: ValidatorMeta, { isDraft }: ValidatorContext) => {
    let validator;

    validator = yup.array().of(
      yup.lazy((item) => {
        const model = strapi.getModel(prop('__component', item));
        const schema = yup
          .object()
          .shape({
            __component: yup.string().required().oneOf(Object.keys(strapi.components)),
          })
          .notNull();

        return model
          ? schema.concat(createModelValidator(createOrUpdate)({ model, data: item }, { isDraft }))
          : schema;
      }) as any // FIXME: yup v1
    );

    validator = addRequiredValidation(createOrUpdate)(validator, {
      attr: { required: true },
      updatedAttribute,
    });

    validator = addMinMax(validator, { attr, updatedAttribute });

    return validator;
  };

const createRelationValidator =
  (createOrUpdate: CreateOrUpdate) =>
  ({ attr, updatedAttribute }: ValidatorMeta, { isDraft }: ValidatorContext) => {
    let validator;

    if (Array.isArray(updatedAttribute.value)) {
      validator = yup.array().of(yup.mixed());
    } else {
      validator = yup.mixed();
    }

    validator = addRequiredValidation(createOrUpdate)(validator, {
      attr: { required: !isDraft && attr.required },
      updatedAttribute,
    });

    return validator;
  };

const createScalarAttributeValidator =
  (createOrUpdate: CreateOrUpdate) => (metas: ValidatorMeta, options: ValidatorContext) => {
    let validator;

    if (has(metas.attr.type, validators)) {
      validator = (validators as any)[metas.attr.type](metas, options);
    } else {
      // No validators specified - fall back to mixed
      validator = yup.mixed();
    }

    validator = addRequiredValidation(createOrUpdate)(validator, {
      attr: { required: !options.isDraft && metas.attr.required },
      updatedAttribute: metas.updatedAttribute,
    });

    return validator;
  };

const createAttributeValidator =
  (createOrUpdate: CreateOrUpdate) =>
  (metas: AttributeValidatorMetas, options: ValidatorContext) => {
    let validator: strapiUtils.yup.BaseSchema;

    if (isMediaAttribute(metas.attr)) {
      validator = yup.mixed();
    } else if (isScalarAttribute(metas.attr)) {
      validator = createScalarAttributeValidator(createOrUpdate)(metas, options);
    } else {
      if (metas.attr.type === 'component') {
        validator = createComponentValidator(createOrUpdate)(metas, options);
      } else if (metas.attr.type === 'dynamiczone') {
        validator = createDzValidator(createOrUpdate)(metas, options);
      } else {
        validator = createRelationValidator(createOrUpdate)(metas, options);
      }

      validator = preventCast(validator);
    }

    validator = addDefault(createOrUpdate)(validator, metas);

    return validator;
  };

const createModelValidator =
  (createOrUpdate: CreateOrUpdate) =>
  ({ model, data, entity }: ModelValidatorMetas, options: ValidatorContext) => {
    const writableAttributes = model ? getWritableAttributes(model) : [];

    const schema = writableAttributes.reduce((validators, attributeName) => {
      const validator = createAttributeValidator(createOrUpdate)(
        {
          attr: model.attributes[attributeName],
          updatedAttribute: { name: attributeName, value: prop(attributeName, data) },
          model,
          entity,
        },
        options
      );

      return assoc(attributeName, validator)(validators);
    }, {} as Record<string, strapiUtils.yup.BaseSchema>);

    return yup.object().shape(schema);
  };

const createValidateEntity =
  (createOrUpdate: CreateOrUpdate) =>
  async (
    model: Schema.ContentType,
    data: Record<string, unknown>,
    { isDraft = false }: { isDraft?: boolean } = {},
    entity?: Entity
  ) => {
    if (!isObject(data)) {
      const { displayName } = model.info;

      throw new ValidationError(
        `Invalid payload submitted for the ${createOrUpdate} of an entity of type ${displayName}. Expected an object, but got ${typeof data}`
      );
    }

    const validator = createModelValidator(createOrUpdate)(
      {
        model,
        data,
        entity,
      },
      { isDraft }
    )
      .test('relations-test', 'check that all relations exist', async function (data) {
        try {
          await checkRelationsExist(buildRelationsStore({ uid: model.uid, data }));
        } catch (e) {
          return this.createError({
            path: this.path,
            message: (e instanceof ValidationError && e.message) || 'Invalid relations',
          });
        }
        return true;
      })
      .required();

    return validateYupSchema(validator, {
      strict: false,
      abortEarly: false,
    })(data);
  };

/**
 * Builds an object containing all the media and relations being associated with an entity
 */
const buildRelationsStore = ({
  uid,
  data,
}: {
  uid: Common.UID.ContentType | Common.UID.Component;
  data: Record<string, unknown> | null;
}): Record<string, ID[]> => {
  if (!uid) {
    throw new ValidationError(`Cannot build relations store: "uid" is undefined`);
  }

  if (isEmpty(data)) {
    return {};
  }

  const currentModel: Schema.ContentType = strapi.getModel(uid);

  return Object.keys(currentModel.attributes).reduce((result, attributeName: string) => {
    const attribute = currentModel.attributes[attributeName];
    const value = data[attributeName];

    if (isNil(value)) {
      return result;
    }

    switch (attribute.type) {
      case 'relation':
      case 'media': {
        if (
          'relation' in attribute &&
          (attribute.relation === 'morphToMany' || attribute.relation === 'morphToOne')
        ) {
          // TODO: handle polymorphic relations
          break;
        }

        const target = attribute.type === 'media' ? 'plugin::upload.file' : attribute.target;
        // As there are multiple formats supported for associating relations
        // with an entity, the value here can be an: array, object or number.
        let source: RelationSource[];
        if (Array.isArray(value)) {
          source = value;
        } else if (isObject(value)) {
          source = castArray(
            ('connect' in value && value.connect) ?? ('set' in value && value.set) ?? []
          ) as RelationSource[];
        } else {
          source = castArray(value as RelationSource);
        }
        const idArray = source.map((v) => ({
          id: typeof v === 'object' ? v.id : v,
        }));

        // Update the relationStore to keep track of all associations being made
        // with relations and media.
        result[target] = result[target] || [];
        result[target].push(...idArray);
        break;
      }
      case 'component': {
        return castArray(value).reduce((relationsStore, componentValue) => {
          if (!attribute.component) {
            throw new ValidationError(
              `Cannot build relations store from component, component identifier is undefined`
            );
          }

          return mergeWith(
            relationsStore,
            buildRelationsStore({
              uid: attribute.component,
              data: componentValue as Record<string, unknown>,
            }),
            (objValue, srcValue) => {
              if (isArray(objValue)) {
                return objValue.concat(srcValue);
              }
            }
          );
        }, result) as Record<string, ID[]>;
      }
      case 'dynamiczone': {
        return castArray(value).reduce((relationsStore, dzValue) => {
          const value = dzValue as Record<string, unknown>;
          if (!value.__component) {
            throw new ValidationError(
              `Cannot build relations store from dynamiczone, component identifier is undefined`
            );
          }

          return mergeWith(
            relationsStore,
            buildRelationsStore({
              uid: value.__component as Common.UID.Component,
              data: value,
            }),
            (objValue, srcValue) => {
              if (isArray(objValue)) {
                return objValue.concat(srcValue);
              }
            }
          );
        }, result) as Record<string, ID[]>;
      }
      default:
        break;
    }

    return result;
  }, {} as Record<string, ID[]>);
};

/**
 * Iterate through the relations store and validates that every relation or media
 * mentioned exists
 */
const checkRelationsExist = async (relationsStore: Record<string, ID[]> = {}) => {
  const promises = [];

  for (const [key, value] of Object.entries(relationsStore)) {
    const evaluate = async () => {
      const uniqueValues = uniqBy(value, `id`);
      const count = await strapi.query(key as UID.ContentType).count({
        where: {
          id: {
            $in: uniqueValues.map((v) => v.id),
          },
        },
      });

      if (count !== uniqueValues.length) {
        throw new ValidationError(
          `${
            uniqueValues.length - count
          } relation(s) of type ${key} associated with this entity do not exist`
        );
      }
    };
    promises.push(evaluate());
  }

  return Promise.all(promises);
};

export default {
  validateEntityCreation: createValidateEntity('creation'),
  validateEntityUpdate: createValidateEntity('update'),
};
