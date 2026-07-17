/**
 * Entity validator
 * Module that will validate input data for entity creation or edition
 */

import { uniqBy, castArray, isNil, isArray, mergeWith } from 'lodash';
import { has, prop, isObject, isEmpty } from 'lodash/fp';
import jsonLogic from 'json-logic-js';
import strapiUtils from '@strapi/utils';
import type { Modules, UID, Struct, Schema } from '@strapi/types';
import { Validators, ValidatorMetas } from './validators';

type CreateOrUpdate = 'creation' | 'update';

const { yup, validateYupSchema } = strapiUtils;
const { isMediaAttribute, isScalarAttribute, getWritableAttributes } = strapiUtils.contentTypes;
const { isAnyToOne } = strapiUtils.relations;
const { ValidationError } = strapiUtils.errors;

type ID = { id: string | number };

type RelationSource = string | number | ID;

export type ComponentContext = {
  parentContent: {
    // The model of the parent content type that contains the current component.
    model: Struct.Schema;
    // The numeric id of the parent entity that contains the component.
    id?: number;
    // The options passed to the entity validator. From which we can extract
    // entity dimensions such as locale and publication state.
    options?: ValidatorContext;
  };
  // The path to the component within the parent content type schema.
  pathToComponent: string[];
  // If working with a repeatable component this contains the
  // full data of the repeatable component in the current entity.
  repeatableData: Modules.EntityValidator.Entity[];
  fullDynamicZoneContent?: Schema.Attribute.Value<Schema.Attribute.DynamicZone>;
};

interface WithComponentContext {
  componentContext?: ComponentContext;
}

interface ValidatorMeta<TAttribute = Schema.Attribute.AnyAttribute> extends WithComponentContext {
  attr: TAttribute;
  updatedAttribute: { name: string; value: any };
}

interface ValidatorContext {
  isDraft?: boolean;
  locale?: string | null;
  strictRelations?: boolean;
}

interface ModelValidatorMetas extends WithComponentContext {
  model: Struct.Schema;
  data: Record<string, unknown>;
  entity?: Modules.EntityValidator.Entity;
}

const isInteger = (value: unknown): value is number => Number.isInteger(value);

const addMinMax = <
  T extends {
    min(value: number): T;
    max(value: number): T;
  },
>(
  validator: T,
  {
    attr,
    updatedAttribute,
  }: ValidatorMeta<Schema.Attribute.AnyAttribute & Schema.Attribute.MinMaxOption<string | number>>
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
    {
      attr: { required },
    }: ValidatorMeta<Partial<Schema.Attribute.AnyAttribute & Schema.Attribute.RequiredOption>>
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
    { attr }: ValidatorMeta<Schema.Attribute.AnyAttribute & Schema.Attribute.DefaultOption<unknown>>
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
    {
      attr,
      updatedAttribute,
      componentContext,
    }: ValidatorMeta<Schema.Attribute.Component<UID.Component, boolean>>,
    options: ValidatorContext
  ): strapiUtils.yup.AnySchema => {
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
            createModelValidator(createOrUpdate)(
              { componentContext, model, data: item },
              options
            ).notNull()
          ) as any
        );

      validator = addRequiredValidation(createOrUpdate)(validator, {
        attr: { required: true },
        updatedAttribute,
      });

      if (!options.isDraft) {
        validator = addMinMax(validator, { attr, updatedAttribute });
      }

      return validator;
    }

    let validator = createModelValidator(createOrUpdate)(
      {
        model,
        data: updatedAttribute.value,
        componentContext,
      },
      options
    );

    validator = addRequiredValidation(createOrUpdate)(validator, {
      attr: { required: !options.isDraft && attr.required },
      updatedAttribute,
    });

    return validator;
  };

const createDzValidator =
  (createOrUpdate: CreateOrUpdate) =>
  (
    { attr, updatedAttribute, componentContext }: ValidatorMeta,
    options: ValidatorContext
  ): strapiUtils.yup.AnySchema => {
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
          ? schema.concat(
              createModelValidator(createOrUpdate)({ model, data: item, componentContext }, options)
            )
          : schema;
      }) as any // FIXME: yup v1
    );

    validator = addRequiredValidation(createOrUpdate)(validator, {
      attr: { required: true },
      updatedAttribute,
    });

    if (!options.isDraft) {
      validator = addMinMax(validator, { attr, updatedAttribute });
    }

    return validator;
  };

/**
 * A relation/media value can be supplied in several shapes: a bare id, an array of ids,
 * or a connect/set object (`{ connect: [...] }` / `{ set: [...] }`). This normalises all
 * of them to "does this attach at least one entry?" so required validation is consistent
 * regardless of the input shape (mirrors `buildRelationsStore`'s source extraction).
 */
const hasRelationValue = (value: unknown): boolean => {
  if (isNil(value)) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isObject(value)) {
    const connect = (value as { connect?: unknown }).connect;
    const set = (value as { set?: unknown }).set;

    if (!isNil(connect)) {
      return Array.isArray(connect) ? connect.length > 0 : true;
    }
    if (!isNil(set)) {
      return Array.isArray(set) ? set.length > 0 : true;
    }

    // Any other object shape (e.g. a bare `{ id }`) counts as a value.
    return true;
  }

  return true;
};

/**
 * A disconnect-only update payload removes entries without adding or replacing any:
 * actual removals in `disconnect`, no `set`, and no effective additions in `connect`.
 * `connect` counts as "no additions" when absent OR an empty array — the Content Manager
 * initializes every relation as `{ connect: [], disconnect: [] }` and keeps `connect: []`
 * in place when the user only removes entries, so `{ connect: [], disconnect: [id] }`
 * is the shape real admin saves produce. A payload with empty `disconnect` (nothing
 * removed) is NOT disconnect-only — it's the CM's untouched-relation no-op.
 */
const isDisconnectOnly = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  const { connect, set, disconnect } = value as {
    connect?: unknown;
    set?: unknown;
    disconnect?: unknown;
  };

  if (!isNil(set)) {
    return false;
  }

  const hasAdditions = !isNil(connect) && (!Array.isArray(connect) || connect.length > 0);
  if (hasAdditions) {
    return false;
  }

  return !isNil(disconnect) && (!Array.isArray(disconnect) || disconnect.length > 0);
};

/**
 * Decides whether a required media/relation value should be rejected as empty,
 * mirroring the scalar `required` semantics:
 *
 * - creation (`notNil` analogue): an absent key is a failure — the field must be
 *   populated, so anything without a value (`undefined`/`null`/`[]`/empty `set`/`connect`)
 *   is rejected.
 * - update (`notNull` analogue): an absent key keeps the existing value, so it passes.
 *   Only reject when the request is present AND leaves the field empty. A bare
 *   `{ connect: [] }` (no `set`) neither adds nor removes anything → treated as a no-op
 *   that passes; `{ set: [] }` / `null` / `[]` explicitly empty the field → rejected.
 *
 * `isToOne` marks a to-one relation / single media, which can hold at most one entry.
 * For those, a disconnect-only update (`{ disconnect: [...] }` with no `connect`/`set`)
 * always leaves the field empty — no DB read needed — so it is rejected on non-draft
 * updates. To-many fields can still hold other entries after a disconnect, so their
 * resulting state can't be known without a DB read and they fall through to a pass
 * (publish re-validates the populated draft for D&P types; documented limitation for
 * non-D&P, tied to the null→[] follow-up).
 */
const relationRequiredFails = (
  createOrUpdate: CreateOrUpdate,
  value: unknown,
  isToOne: boolean
): boolean => {
  if (createOrUpdate === 'update') {
    // Absent key on update = keep the existing value.
    if (value === undefined) {
      return false;
    }

    if (isDisconnectOnly(value)) {
      // A disconnect on a to-one/single field deterministically empties it; on a to-many
      // field the resulting state depends on the current DB rows, so we can't reject here.
      return isToOne;
    }

    // A connect-only empty is a no-op, not an emptying operation.
    if (isObject(value) && !isNil((value as { connect?: unknown }).connect)) {
      const connect = (value as { connect?: unknown }).connect;
      const hasSet = !isNil((value as { set?: unknown }).set);
      if (!hasSet && Array.isArray(connect) && connect.length === 0) {
        return false;
      }
    }
  }

  return !hasRelationValue(value);
};

const createMediaAttributeValidator =
  (createOrUpdate: CreateOrUpdate) =>
  (
    { attr, updatedAttribute }: ValidatorMeta<Schema.Attribute.Media>,
    options: ValidatorContext
  ): strapiUtils.yup.AnySchema => {
    // Media values arrive in several shapes (a bare id, an array of ids, or a
    // `{ connect }` / `{ set }` object on update). `yup.mixed()` accepts all of them;
    // coercing `multiple` media to `yup.array()` would reject the connect/set object
    // syntax that update requests legitimately send. Required-ness is asserted below
    // via `relationRequiredFails`, which understands every shape.
    let validator: strapiUtils.yup.AnySchema = yup.mixed();

    // Relational required constraints are only enforced under the strictRelations flag,
    // and never for drafts (mirrors scalar `required` handling via `!isDraft`).
    if (options.strictRelations && !options.isDraft && attr.required) {
      // A media value can arrive as an id, an array, or a connect/set object, so a simple
      // `.notNil()`/`.min()` is not enough — normalise the shape before asserting.
      // Single media holds at most one file, so a disconnect-only update always empties it.
      const isToOne = !attr.multiple;
      validator = validator.test(
        'required-media',
        `${updatedAttribute.name} must be defined.`,
        () => !relationRequiredFails(createOrUpdate, updatedAttribute.value, isToOne)
      );
    }

    return validator;
  };

const createRelationValidator =
  (createOrUpdate: CreateOrUpdate) =>
  (
    { attr, updatedAttribute }: ValidatorMeta<Schema.Attribute.Relation>,
    options: ValidatorContext
  ): strapiUtils.yup.AnySchema => {
    let validator: strapiUtils.yup.AnySchema;

    if (Array.isArray(updatedAttribute.value)) {
      validator = yup.array().of(yup.mixed());
    } else {
      validator = yup.mixed();
    }

    // Relational required constraints are only enforced under the strictRelations flag,
    // and never for drafts (mirrors scalar `required` handling via `!isDraft`).
    if (options.strictRelations && !options.isDraft && attr.required) {
      // A relation value can arrive as an id, an array, or a connect/set object, so a
      // simple `.notNil()`/`.min()` is not enough — normalise the shape before asserting.
      // A to-one relation holds at most one target, so a disconnect-only update always empties it.
      const isToOne = isAnyToOne(attr);
      validator = validator.test(
        'required-relation',
        `${updatedAttribute.name} must be defined.`,
        () => !relationRequiredFails(createOrUpdate, updatedAttribute.value, isToOne)
      );
    }

    return validator;
  };

const createScalarAttributeValidator =
  (createOrUpdate: CreateOrUpdate) => (metas: ValidatorMeta, options: ValidatorContext) => {
    let validator;

    if (has(metas.attr.type, Validators)) {
      validator = (Validators as any)[metas.attr.type](metas, options);
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
  (metas: ValidatorMetas, options: ValidatorContext): strapiUtils.yup.AnySchema => {
    let validator = yup.mixed();

    // If field is conditionally invisible, skip all validation for it
    if (metas.attr.conditions?.visible) {
      const isVisible = jsonLogic.apply(metas.attr.conditions.visible, metas.data);

      if (!isVisible) {
        return yup.mixed().notRequired(); // Completely skip validation
      }
    }

    if (isMediaAttribute(metas.attr)) {
      validator = createMediaAttributeValidator(createOrUpdate)(
        {
          attr: metas.attr as Schema.Attribute.Media,
          updatedAttribute: metas.updatedAttribute,
        },
        options
      );
    } else if (isScalarAttribute(metas.attr)) {
      validator = createScalarAttributeValidator(createOrUpdate)(metas, options);
    } else {
      if (metas.attr.type === 'component' && metas.componentContext) {
        // Build the path to the component within the parent content type schema.
        const pathToComponent = [
          ...(metas?.componentContext?.pathToComponent ?? []),
          metas.updatedAttribute.name,
        ];

        // If working with a repeatable component, determine the repeatable data
        // based on the component's path.

        // In order to validate the repeatable within this entity we need
        // access to the full repeatable data. In case we are validating a
        // nested component within a repeatable.
        // Hence why we set this up when the path to the component is only one level deep.
        const repeatableData = (
          metas.attr.repeatable && pathToComponent.length === 1
            ? metas.updatedAttribute.value
            : metas.componentContext?.repeatableData
        ) as Modules.EntityValidator.Entity[];

        const newComponentContext: ComponentContext = {
          ...metas.componentContext,
          pathToComponent,
          repeatableData,
        };

        validator = createComponentValidator(createOrUpdate)(
          {
            componentContext: newComponentContext,
            attr: metas.attr,
            updatedAttribute: metas.updatedAttribute,
          },
          options
        );
      } else if (metas.attr.type === 'dynamiczone' && metas.componentContext) {
        const newComponentContext: ComponentContext = {
          ...metas.componentContext,
          fullDynamicZoneContent: metas.updatedAttribute.value,
          pathToComponent: [...metas.componentContext.pathToComponent, metas.updatedAttribute.name],
        };

        Object.assign(metas, { componentContext: newComponentContext });

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
  (
    { componentContext, model, data, entity }: ModelValidatorMetas,
    options: ValidatorContext
  ): strapiUtils.yup.AnyObjectSchema => {
    const writableAttributes = model ? getWritableAttributes(model as any) : [];

    const schema = writableAttributes.reduce(
      (validators, attributeName) => {
        const metas = {
          attr: model.attributes[attributeName],
          updatedAttribute: { name: attributeName, value: prop(attributeName, data) },
          data,
          model,
          entity,
          componentContext,
        };

        const validator = createAttributeValidator(createOrUpdate)(metas, options);

        validators[attributeName] = validator;

        return validators;
      },
      {} as Record<string, strapiUtils.yup.BaseSchema>
    );

    return yup.object().shape(schema);
  };

const createValidateEntity = (createOrUpdate: CreateOrUpdate) => {
  return async <
    TUID extends UID.ContentType,
    TData extends Modules.EntityService.Params.Data.Input<TUID>,
  >(
    model: Schema.ContentType<TUID>,
    data: TData | Partial<TData> | undefined,
    options?: ValidatorContext,
    entity?: Modules.EntityValidator.Entity
  ): Promise<TData> => {
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
        componentContext: {
          // Set up the initial component context.
          // Keeping track of parent content type context in which a component will be used.
          // This is necessary to validate component field constraints such as uniqueness.
          parentContent: {
            id: entity?.id,
            model,
            options,
          },
          pathToComponent: [],
          repeatableData: [],
        },
      },
      {
        isDraft: options?.isDraft ?? false,
        locale: options?.locale ?? null,
        strictRelations: options?.strictRelations ?? false,
      }
    )
      .test(
        'relations-test',
        'check that all relations exist',
        async function relationsValidation(data) {
          try {
            await checkRelationsExist(buildRelationsStore({ uid: model.uid, data }));
          } catch (e) {
            return this.createError({
              path: this.path,
              message: (e instanceof ValidationError && e.message) || 'Invalid relations',
            });
          }
          return true;
        }
      )
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
const buildRelationsStore = <TUID extends UID.Schema>({
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

  return Object.keys(currentModel.attributes).reduce(
    (result, attributeName: string) => {
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
                uid: value.__component as UID.Component,
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
    },
    {} as Record<string, ID[]>
  );
};

/**
 * Iterate through the relations store and validates that every relation or media
 * mentioned exists
 */
const checkRelationsExist = async (relationsStore: Record<string, ID[]> = {}) => {
  const promises: Promise<void>[] = [];

  for (const [key, value] of Object.entries(relationsStore)) {
    const evaluate = async () => {
      const uniqueValues = uniqBy(value, `id`);
      const count = await strapi.db.query(key as UID.Schema).count({
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

const entityValidator: Modules.EntityValidator.EntityValidator = {
  validateEntityCreation: createValidateEntity('creation'),
  validateEntityUpdate: createValidateEntity('update'),
};

export default entityValidator;
