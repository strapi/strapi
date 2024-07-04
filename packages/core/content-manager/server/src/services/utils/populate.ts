import { merge, isEmpty, set, propEq } from 'lodash/fp';
import strapiUtils from '@strapi/utils';
import { UID, Schema, Modules } from '@strapi/types';
import { getService } from '../../utils';

const { isVisibleAttribute, isScalarAttribute, getDoesAttributeRequireValidation } =
  strapiUtils.contentTypes;
const { isAnyToMany } = strapiUtils.relations;
const { PUBLISHED_AT_ATTRIBUTE } = strapiUtils.contentTypes.constants;

const isMorphToRelation = (attribute: any) =>
  isRelation(attribute) && attribute.relation.includes('morphTo');
const isMedia = propEq('type', 'media');
const isRelation = propEq('type', 'relation');
const isComponent = propEq('type', 'component');
const isDynamicZone = propEq('type', 'dynamiczone');

// TODO: Import from @strapi/types when it's available there
type Model = Parameters<typeof isVisibleAttribute>[0];
export type Populate = Modules.EntityService.Params.Populate.Any<UID.Schema>;

type PopulateOptions = {
  initialPopulate?: Populate;
  countMany?: boolean;
  countOne?: boolean;
  maxLevel?: number;
};

/**
 * Populate the model for relation
 * @param attribute - Attribute containing a relation
 * @param attribute.relation - type of relation
 * @param model - Model of the populated entity
 * @param attributeName
 * @param options - Options to apply while populating
 */
function getPopulateForRelation(
  attribute: Schema.Attribute.AnyAttribute,
  model: Model,
  attributeName: string,
  { countMany, countOne, initialPopulate }: PopulateOptions
) {
  const isManyRelation = isAnyToMany(attribute);

  if (initialPopulate) {
    return initialPopulate;
  }

  // always populate createdBy, updatedBy, localizations etc.
  if (!isVisibleAttribute(model, attributeName)) {
    return true;
  }

  if ((isManyRelation && countMany) || (!isManyRelation && countOne)) {
    return { count: true };
  }

  return true;
}

/**
 * Populate the model for Dynamic Zone components
 * @param attribute - Attribute containing the components
 * @param attribute.components - IDs of components
 * @param options - Options to apply while populating
 */
function getPopulateForDZ(
  attribute: Schema.Attribute.DynamicZone,
  options: PopulateOptions,
  level: number
) {
  // Use fragments to populate the dynamic zone components
  const populatedComponents = (attribute.components || []).reduce(
    (acc: any, componentUID: UID.Component) => ({
      ...acc,
      [componentUID]: {
        populate: getDeepPopulate(componentUID, options, level + 1),
      },
    }),
    {}
  );

  return { on: populatedComponents };
}

/**
 * Get the populated value based on the type of the attribute
 * @param attributeName - Name of the attribute
 * @param model - Model of the populated entity
 * @param model.attributes
 * @param options - Options to apply while populating
 * @param options.countMany
 * @param options.countOne
 * @param options.maxLevel
 * @param level
 */
function getPopulateFor(
  attributeName: string,
  model: any,
  options: PopulateOptions,
  level: number
): { [key: string]: boolean | object } {
  const attribute = model.attributes[attributeName];

  switch (attribute.type) {
    case 'relation':
      // @ts-expect-error - TODO: support populate count typing
      return {
        [attributeName]: getPopulateForRelation(attribute, model, attributeName, options),
      };
    case 'component':
      return {
        [attributeName]: {
          populate: getDeepPopulate(attribute.component, options, level + 1),
        },
      };
    case 'media':
      return {
        [attributeName]: {
          populate: {
            folder: true,
          },
        },
      };
    case 'dynamiczone':
      return {
        [attributeName]: getPopulateForDZ(attribute, options, level),
      };
    default:
      return {};
  }
}

/**
 * Deeply populate a model based on UID
 * @param uid - Unique identifier of the model
 * @param options - Options to apply while populating
 * @param level - Current level of nested call
 */
const getDeepPopulate = (
  uid: UID.Schema,
  {
    initialPopulate = {} as any,
    countMany = false,
    countOne = false,
    maxLevel = Infinity,
  }: PopulateOptions = {},
  level = 1
) => {
  if (level > maxLevel) {
    return {};
  }

  const model = strapi.getModel(uid);

  return Object.keys(model.attributes).reduce(
    (populateAcc, attributeName: string) =>
      merge(
        populateAcc,
        getPopulateFor(
          attributeName,
          model,
          {
            // @ts-expect-error - improve types
            initialPopulate: initialPopulate?.[attributeName],
            countMany,
            countOne,
            maxLevel,
          },
          level
        )
      ),
    {}
  );
};

/**
 * Deeply populate a model based on UID. Only populating fields that require validation.
 * @param uid - Unique identifier of the model
 * @param options - Options to apply while populating
 * @param level - Current level of nested call
 */
const getValidatableFieldsPopulate = (
  uid: UID.Schema,
  {
    initialPopulate = {} as any,
    countMany = false,
    countOne = false,
    maxLevel = Infinity,
  }: PopulateOptions = {},
  level = 1
) => {
  if (level > maxLevel) {
    return {};
  }

  const model = strapi.getModel(uid);

  return Object.entries(model.attributes).reduce((populateAcc, [attributeName, attribute]) => {
    if (!getDoesAttributeRequireValidation(attribute)) {
      // If the attribute does not require validation, skip it
      return populateAcc;
    }

    if (isScalarAttribute(attribute)) {
      return merge(populateAcc, {
        [attributeName]: true,
      });
    }

    return merge(
      populateAcc,
      getPopulateFor(
        attributeName,
        model,
        {
          // @ts-expect-error - improve types
          initialPopulate: initialPopulate?.[attributeName],
          countMany,
          countOne,
          maxLevel,
        },
        level
      )
    );
  }, {});
};

/**
 * getDeepPopulateDraftCount works recursively on the attributes of a model
 * creating a populated object to count all the unpublished relations within the model
 * These relations can be direct to this content type or contained within components/dynamic zones
 * @param  uid of the model
 * @returns result
 * @returns result.populate
 * @returns result.hasRelations
 */
const getDeepPopulateDraftCount = (uid: UID.Schema) => {
  const model = strapi.getModel(uid);
  let hasRelations = false;

  const populate = Object.keys(model.attributes).reduce((populateAcc: any, attributeName) => {
    const attribute: Schema.Attribute.AnyAttribute = model.attributes[attributeName];

    switch (attribute.type) {
      case 'relation': {
        // TODO: Support polymorphic relations
        const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');
        if (isMorphRelation) {
          break;
        }

        if (isVisibleAttribute(model, attributeName)) {
          populateAcc[attributeName] = {
            count: true,
            filters: { [PUBLISHED_AT_ATTRIBUTE]: { $null: true } },
          };
          hasRelations = true;
        }
        break;
      }
      case 'component': {
        const { populate, hasRelations: childHasRelations } = getDeepPopulateDraftCount(
          attribute.component
        );
        if (childHasRelations) {
          populateAcc[attributeName] = {
            populate,
          };
          hasRelations = true;
        }
        break;
      }
      case 'dynamiczone': {
        const dzPopulateFragment = attribute.components?.reduce((acc, componentUID) => {
          const { populate: componentPopulate, hasRelations: componentHasRelations } =
            getDeepPopulateDraftCount(componentUID);

          if (componentHasRelations) {
            hasRelations = true;

            return { ...acc, [componentUID]: { populate: componentPopulate } };
          }

          return acc;
        }, {});

        if (!isEmpty(dzPopulateFragment)) {
          populateAcc[attributeName] = { on: dzPopulateFragment };
        }
        break;
      }
      default:
    }

    return populateAcc;
  }, {});

  return { populate, hasRelations };
};

/**
 *  Create a Strapi populate object which populates all attribute fields of a Strapi query.
 */
const getQueryPopulate = async (uid: UID.Schema, query: object): Promise<Populate> => {
  let populateQuery: Populate = {};

  await strapiUtils.traverse.traverseQueryFilters(
    /**
     *
     * @param {Object} param0
     * @param {string} param0.key - Attribute name
     * @param {Object} param0.attribute - Attribute definition
     * @param {string} param0.path - Content Type path to the attribute
     * @returns
     */
    ({ attribute, path }: any) => {
      // TODO: handle dynamic zones and morph relations
      if (!attribute || isDynamicZone(attribute) || isMorphToRelation(attribute)) {
        return;
      }

      // Populate all relations, components and media
      if (isRelation(attribute) || isMedia(attribute) || isComponent(attribute)) {
        const populatePath = path.attribute.replace(/\./g, '.populate.');
        // @ts-expect-error - lodash doesn't resolve the Populate type correctly
        populateQuery = set(populatePath, {}, populateQuery);
      }
    },
    { schema: strapi.getModel(uid), getModel: strapi.getModel.bind(strapi) },
    query
  );

  return populateQuery;
};

const buildDeepPopulate = (uid: UID.CollectionType) => {
  return getService('populate-builder')(uid).populateDeep(Infinity).countRelations().build();
};

export {
  getDeepPopulate,
  getDeepPopulateDraftCount,
  getQueryPopulate,
  buildDeepPopulate,
  getValidatableFieldsPopulate,
};
