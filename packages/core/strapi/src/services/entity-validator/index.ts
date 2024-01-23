/**
 * Entity validator
 * Module that will validate input data for entity creation or edition
 */

import { uniqBy, castArray, isNil, isArray, mergeWith } from 'lodash';
import { has, prop, isObject, isEmpty } from 'lodash/fp';
import strapiUtils from '@strapi/utils';
import { EntityValidator, Common, Schema, Attribute, Shared, EntityService } from '@strapi/types';
import validators from './validators';

type CreateOrUpdate = 'creation' | 'update';

const { yup, validateYupSchema } = strapiUtils;
const { isMediaAttribute, isScalarAttribute, getWritableAttributes } = strapiUtils.contentTypes;
const { ValidationError } = strapiUtils.errors;

type Entity = {
  id: ID;
  [key: string]: unknown;
} | null;

type ID = { id: string | number };

type RelationSource = string | number | ID;

interface ValidatorMeta<TAttribute = Attribute.Any> {
  attr: TAttribute;
  updatedAttribute: { name: string; value: any };
}

interface ValidatorContext {
  isDraft: boolean;
}

interface AttributeValidatorMetas {
  attr: Attribute.Any;
  updatedAttribute: { name: string; value: unknown };
  model: Schema.ContentType | Schema.Component;
  entity?: Entity;
}

interface ModelValidatorMetas {
  model: Schema.ContentType | Schema.Component;
  data: Record<string, unknown>;
  entity?: Entity;
}

const isInteger = (value: unknown): value is number => Number.isInteger(value);

const addMinMax = <
  T extends {
    min(value: number): T;
    max(value: number): T;
  }
>(
  validator: T,
  { attr, updatedAttribute }: ValidatorMeta<Attribute.Any & Attribute.MinMaxOption<string | number>>
): T => {
  let nextValidator: T = validator;

  if (
    isInteger(attr.min) &&
    (('required' in attr && attr.required) ||
      (Array.isArray(updatedAttribute.value) && updatedAttribute.value.length > 0))
  ) {
    nextValidator = nextValidator.min(attr.min);
  }
  if (isInteger(attr.max)) {
    nextValidator = nextValidator.max(attr.max);
  }
  return nextValidator;
};

const addRequiredValidation = (createOrUpdate: CreateOrUpdate) => {
  return <T extends strapiUtils.yup.AnySchema>(
    validator: T,
    { attr: { required } }: ValidatorMeta<Partial<Attribute.Any & Attribute.RequiredOption>>
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
  return (
    validator: strapiUtils.yup.BaseSchema,
    { attr }: ValidatorMeta<Attribute.Any & Attribute.DefaultOption<unknown>>
  ) => {
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
  (
    { attr, updatedAttribute }: ValidatorMeta<Attribute.Component<Common.UID.Component, boolean>>,
    { isDraft }: ValidatorContext
  ) => {
    const model = strapi.getModel(attr.component);
    if (!model) {
      throw new Error('Validation failed: Model not found');
    }

    if (attr?.repeatable) {
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
    let validator = createModelValidator(createOrUpdate)(
      { model, data: updatedAttribute.value },
      { isDraft }
    );

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
  (
    { attr, updatedAttribute }: ValidatorMeta<Attribute.Relation>,
    { isDraft }: ValidatorContext
  ) => {
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
    let validator = yup.mixed();

    if (isMediaAttribute(metas.attr)) {
      validator = yup.mixed();
    } else if (isScalarAttribute(metas.attr)) {
      validator = createScalarAttributeValidator(createOrUpdate)(metas, options);
    } else {
      if (metas.attr.type === 'component') {
        validator = createComponentValidator(createOrUpdate)(
          { attr: metas.attr, updatedAttribute: metas.updatedAttribute },
          options
        );
      } else if (metas.attr.type === 'dynamiczone') {
        validator = createDzValidator(createOrUpdate)(metas, options);
      } else if (metas.attr.type === 'relation') {
        validator = createRelationValidator(createOrUpdate)(
          {
            attr: metas.attr,
            updatedAttribute: metas.updatedAttribute,
          },
          options
        );
      }

      validator = preventCast(validator);
    }

    validator = addDefault(createOrUpdate)(validator, metas);

    return validator;
  };

const createModelValidator =
  (createOrUpdate: CreateOrUpdate) =>
  ({ model, data, entity }: ModelValidatorMetas, options: ValidatorContext) => {
    const writableAttributes = model ? getWritableAttributes(model as any) : [];

    const schema = writableAttributes.reduce((validators, attributeName) => {
      const metas = {
        attr: model.attributes[attributeName],
        updatedAttribute: { name: attributeName, value: prop(attributeName, data) },
        model,
        entity,
      };

      const validator = createAttributeValidator(createOrUpdate)(metas, options);

      validators[attributeName] = validator;

      return validators;
    }, {} as Record<string, strapiUtils.yup.BaseSchema>);

    return yup.object().shape(schema);
  };

const createValidateEntity = (createOrUpdate: CreateOrUpdate) => {
  return async <
    TUID extends Common.UID.ContentType,
    TData extends EntityService.Params.Data.Input<TUID>
  >(
    model: Shared.ContentTypes[TUID],
    data: TData | Partial<TData> | undefined,
    options?: { isDraft?: boolean },
    entity?: Entity
  ): Promise<TData> => {
    if (!isObject(data)) {
      const { displayName } = model.info;

      throw new ValidationError(
        `Invalid payload submitted for the ${createOrUpdate} of an entity of type ${displayName}. Expected an object, but got ${typeof data}`
      );
    }

    const validator = createModelValidator(createOrUpdate)(
      { model, data, entity },
      { isDraft: options?.isDraft ?? false }
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
};

/**
 * Builds an object containing all the media and relations being associated with an entity
 */
const buildRelationsStore = <TUID extends Common.UID.ContentType | Common.UID.Component>({
  uid,
  data,
}: {
  uid: TUID;
  data: Record<string, unknown> | null;
}): Record<string, ID[]> => {
  if (!uid) {
    throw new ValidationError(`Cannot build relations store: "uid" is undefined`);
  }

  if (isEmpty(data)) {
    return {};
  }

  const currentModel = strapi.getModel(uid);

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
          attribute.type === 'relation' &&
          (attribute.relation === 'morphToMany' || attribute.relation === 'morphToOne')
        ) {
          // TODO: handle polymorphic relations
          break;
        }

        const target =
          // eslint-disable-next-line no-nested-ternary
          attribute.type === 'media' ? 'plugin::upload.file' : attribute.target;
        // As there are multiple formats supported for associating relations
        // with an entity, the value here can be an: array, object or number.
        let source: RelationSource[];
        if (Array.isArray(value)) {
          source = value;
        } else if (isObject(value)) {
          if ('connect' in value && !isNil(value.connect)) {
            source = value.connect as RelationSource[];
          } else if ('set' in value && !isNil(value.set)) {
            source = value.set as RelationSource[];
          } else {
            source = [];
          }
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
      const count = await strapi.query(key as Common.UID.Schema).count({
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

const entityValidator: EntityValidator = {
  validateEntityCreation: createValidateEntity('creation'),
  validateEntityUpdate: createValidateEntity('update'),
};

export default entityValidator;
