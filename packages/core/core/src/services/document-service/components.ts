import _, { assign, curry, has, omit } from 'lodash';
import type { Utils, UID, Schema, Data, Modules } from '@strapi/types';
import { contentTypes as contentTypesUtils, async, errors } from '@strapi/utils';
import {
  getComponentJoinTableName,
  getComponentJoinColumnEntityName,
  getComponentJoinColumnInverseName,
  getComponentTypeColumn,
} from '../../utils/transform-content-types-to-models';

// type aliases for readability
type Input<T extends UID.Schema> = Modules.Documents.Params.Data.Input<T>;

type LoadedComponents<TUID extends UID.Schema> = Data.Entity<
  TUID,
  Schema.AttributeNamesByType<TUID, 'component' | 'dynamiczone'>
>;

type SingleComponentValue = Schema.Attribute.ComponentValue<UID.Component, false>;
type RepeatableComponentValue = Schema.Attribute.ComponentValue<UID.Component, true>;

type ComponentValue = SingleComponentValue | RepeatableComponentValue;

type DynamicZoneValue = Schema.Attribute.DynamicZoneValue<UID.Component[]>;

type ComponentBody = {
  [key: string]: ComponentValue | DynamicZoneValue;
};

const omitComponentData = curry(
  (schema: Schema.Schema, data: Input<UID.Schema>): Partial<Input<UID.Schema>> => {
    const { attributes } = schema;
    const componentAttributes = Object.keys(attributes).filter((attributeName) =>
      contentTypesUtils.isComponentAttribute(attributes[attributeName])
    );

    return omit(data, componentAttributes);
  }
);

// NOTE: we could generalize the logic to allow CRUD of relation directly in the DB layer
const createComponents = async <TUID extends UID.Schema, TData extends Input<TUID>>(
  uid: TUID,
  data: TData
) => {
  const { attributes = {} } = strapi.getModel(uid);

  const componentBody: ComponentBody = {};

  const attributeNames = Object.keys(attributes);

  for (const attributeName of attributeNames) {
    const attribute = attributes[attributeName];

    if (!has(data, attributeName) || !contentTypesUtils.isComponentAttribute(attribute)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = data[attributeName as keyof TData];

      if (componentValue === null) {
        continue;
      }

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        const components: RepeatableComponentValue = await async.map(componentValue, (value: any) =>
          createComponent(componentUID, value)
        );

        componentBody[attributeName] = components.map(({ id }) => {
          return {
            id,
            __pivot: {
              field: attributeName,
              component_type: componentUID,
            },
          };
        });
      } else {
        const component = await createComponent(
          componentUID,
          componentValue as Input<UID.Component>
        );

        componentBody[attributeName] = {
          id: component.id,
          __pivot: {
            field: attributeName,
            component_type: componentUID,
          },
        };
      }

      continue;
    }

    if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[
        attributeName as keyof TData
      ] as Modules.EntityService.Params.Attribute.GetValue<Schema.Attribute.DynamicZone>;

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      const createDynamicZoneComponents = async (
        value: Utils.Array.Values<typeof dynamiczoneValues>
      ) => {
        const { id } = await createComponent(value.__component, value);
        return {
          id,
          __component: value.__component,
          __pivot: {
            field: attributeName,
          },
        };
      };

      // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
      componentBody[attributeName] = await async.map(
        dynamiczoneValues,
        createDynamicZoneComponents
      );

      continue;
    }
  }

  return componentBody;
};

const getComponents = async <TUID extends UID.Schema>(
  uid: TUID,
  entity: { id: Modules.EntityService.Params.Attribute.ID }
): Promise<LoadedComponents<TUID>> => {
  const componentAttributes = contentTypesUtils.getComponentAttributes(strapi.getModel(uid));

  if (_.isEmpty(componentAttributes)) {
    return {} as LoadedComponents<TUID>;
  }

  return strapi.db.query(uid).load(entity, componentAttributes) as Promise<LoadedComponents<TUID>>;
};

/*
  delete old components
  create or update
*/
const updateComponents = async <TUID extends UID.Schema, TData extends Partial<Input<TUID>>>(
  uid: TUID,
  entityToUpdate: { id: Modules.EntityService.Params.Attribute.ID },
  data: TData
) => {
  const { attributes = {} } = strapi.getModel(uid);

  const componentBody: ComponentBody = {};

  for (const attributeName of Object.keys(attributes)) {
    const attribute = attributes[attributeName];

    if (!has(data, attributeName)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = data[attributeName as keyof TData] as ComponentValue;
      await deleteOldComponents(uid, componentUID, entityToUpdate, attributeName, componentValue);

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        const components: RepeatableComponentValue = await async.map(componentValue, (value: any) =>
          updateOrCreateComponent(componentUID, value)
        );

        componentBody[attributeName] = components.filter(_.negate(_.isNil)).map(({ id }) => {
          return {
            id,
            __pivot: {
              field: attributeName,
              component_type: componentUID,
            },
          };
        });
      } else {
        const component = await updateOrCreateComponent(componentUID, componentValue);
        componentBody[attributeName] = component && {
          id: component.id,
          __pivot: {
            field: attributeName,
            component_type: componentUID,
          },
        };
      }
    } else if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[attributeName as keyof TData] as DynamicZoneValue;

      await deleteOldDZComponents(uid, entityToUpdate, attributeName, dynamiczoneValues);

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
      componentBody[attributeName] = await async.map(dynamiczoneValues, async (value: any) => {
        const { id } = await updateOrCreateComponent(value.__component, value);

        return {
          id,
          __component: value.__component,
          __pivot: {
            field: attributeName,
          },
        };
      });
    }
  }

  return componentBody;
};

const pickStringifiedId = ({
  id,
}: {
  id: Modules.EntityService.Params.Attribute.ID;
}): Modules.EntityService.Params.Attribute.ID & string => {
  if (typeof id === 'string') {
    return id;
  }

  return `${id}`;
};

const deleteOldComponents = async <TUID extends UID.Schema>(
  uid: TUID,
  componentUID: UID.Component,
  entityToUpdate: { id: Modules.EntityService.Params.Attribute.ID },
  attributeName: string,
  componentValue: ComponentValue
) => {
  const previousValue = (await strapi.db
    .query(uid)
    .load(entityToUpdate, attributeName)) as ComponentValue;
  const idsToKeep = _.castArray(componentValue)
    .filter((value) => has(value, 'id'))
    .map(pickStringifiedId);
  const allIds = _.castArray(previousValue)
    .filter((value) => has(value, 'id'))
    .map(pickStringifiedId);

  idsToKeep.forEach((id) => {
    if (!allIds.includes(id)) {
      throw new errors.ApplicationError(
        `Some of the provided components in ${attributeName} are not related to the entity`
      );
    }
  });

  const idsToDelete = _.difference(allIds, idsToKeep);

  if (idsToDelete.length > 0) {
    for (const idToDelete of idsToDelete) {
      await deleteComponent(componentUID, { id: idToDelete });
    }
  }
};

const deleteOldDZComponents = async <TUID extends UID.Schema>(
  uid: TUID,
  entityToUpdate: { id: Modules.EntityService.Params.Attribute.ID },
  attributeName: string,
  dynamiczoneValues: DynamicZoneValue
) => {
  const previousValue = (await strapi.db
    .query(uid)
    .load(entityToUpdate, attributeName)) as DynamicZoneValue;

  const idsToKeep = _.castArray(dynamiczoneValues)
    .filter((value) => has(value, 'id'))
    .map((v) => ({
      id: pickStringifiedId(v),
      __component: v.__component,
    }));

  const allIds = _.castArray(previousValue)
    .filter((value) => has(value, 'id'))
    .map((v) => ({
      id: pickStringifiedId(v),
      __component: v.__component,
    }));

  idsToKeep.forEach(({ id, __component: componentUID }) => {
    if (!allIds.find((el) => el.id === id && el.__component === componentUID)) {
      const err = new Error(
        `Some of the provided components in ${attributeName} are not related to the entity`
      );

      Object.assign(err, { status: 400 });
      throw err;
    }
  });

  type IdsToDelete = DynamicZoneValue;

  const idsToDelete = allIds.reduce((acc, { id, __component: componentUID }) => {
    if (!idsToKeep.find((el) => el.id === id && el.__component === componentUID)) {
      acc.push({ id, __component: componentUID });
    }

    return acc;
  }, [] as IdsToDelete);

  if (idsToDelete.length > 0) {
    for (const idToDelete of idsToDelete) {
      const { id, __component: componentUID } = idToDelete;
      await deleteComponent(componentUID, { id });
    }
  }
};

const deleteComponents = async <TUID extends UID.Schema, TEntity extends Data.Entity<TUID>>(
  uid: TUID,
  entityToDelete: TEntity,
  { loadComponents = true } = {}
) => {
  const { attributes = {} } = strapi.getModel(uid);

  const attributeNames = Object.keys(attributes);

  for (const attributeName of attributeNames) {
    const attribute = attributes[attributeName];

    if (attribute.type === 'component' || attribute.type === 'dynamiczone') {
      let value;

      if (loadComponents) {
        value = await strapi.db.query(uid).load(entityToDelete, attributeName);
      } else {
        value = entityToDelete[attributeName as keyof TEntity];
      }

      if (!value) {
        continue;
      }

      if (attribute.type === 'component') {
        const { component: componentUID } = attribute;
        await async.map(_.castArray(value), (subValue: any) =>
          deleteComponent(componentUID, subValue)
        );
      } else {
        await async.map(_.castArray(value), (subValue: any) =>
          deleteComponent(subValue.__component, subValue)
        );
      }

      continue;
    }
  }
};

/** *************************
    Component queries
************************** */

// components can have nested compos so this must be recursive
const createComponent = async <TUID extends UID.Component>(
  uid: TUID,
  data: Input<TUID>
): Promise<Data.Component<TUID>> => {
  const schema = strapi.getModel(uid);

  const componentData = await createComponents(uid, data);

  // Make sure we don't save the component with a pre-defined ID.
  const entryData = assignComponentData(schema, componentData, omit(data, 'id'));

  return strapi.db.query(uid).create({ data: entryData });
};

// components can have nested compos so this must be recursive
const updateComponent = async <TUID extends UID.Component>(
  uid: TUID,
  componentToUpdate: { id: Modules.EntityService.Params.Attribute.ID },
  data: Input<TUID>
) => {
  const schema = strapi.getModel(uid);

  const componentData = await updateComponents(uid, componentToUpdate, data);

  return strapi.db.query(uid).update({
    where: {
      id: componentToUpdate.id,
    },
    data: assignComponentData(schema, componentData, data),
  });
};

const updateOrCreateComponent = <TUID extends UID.Component>(
  componentUID: TUID,
  value: Input<TUID>
) => {
  if (value === null) {
    return null;
  }

  // update
  if ('id' in value && typeof value.id !== 'undefined') {
    // TODO: verify the compo is associated with the entity
    return updateComponent(componentUID, { id: value.id }, value);
  }

  // create
  return createComponent(componentUID, value);
};

const deleteComponent = async <TUID extends UID.Component>(
  uid: TUID,
  componentToDelete: Data.Component<TUID>
) => {
  await deleteComponents(uid, componentToDelete);
  await strapi.db.query(uid).delete({ where: { id: componentToDelete.id } });
};

const assignComponentData = curry(
  (schema: Schema.Schema, componentData: ComponentBody, data: Input<UID.Schema>) => {
    return assign({}, componentData, omitComponentData(schema, data));
  }
);

/** *************************
    Component relation handling for document operations
************************** */

type ComponentParent = { uid: string; table: string; parentId: number | string };

// Component instance ids are bound as query parameters, so look them up in batches that stay
// well below the bind parameter limit of every supported database
const PARENT_LOOKUP_BATCH_SIZE = 500;

/**
 * Find the parent entries of many instances of the same component.
 *
 * Given a component model, component instance ids, and the list of possible parent
 * content types and components (those that can embed this component), this function
 * checks each parent's *_cmps join table to see which instances it links to a parent.
 * Parents are checked in order and the first one linking an instance is its parent.
 *
 * Each parent costs one query per batch of instances rather than one query per instance,
 * and parents are no longer checked once every instance has been found.
 *
 * - Returns a map from component instance id (as a string) to its parent uid, parent table
 *   name and parent id.
 * - Instances without a parent are not in the map.
 */
const findComponentParents = async (
  componentSchema: Schema.Component,
  componentIds: (number | string)[],
  parentSchemasForComponent: (Schema.ContentType | Schema.Component)[],
  opts?: { trx?: any }
): Promise<Map<string, ComponentParent>> => {
  const parents = new Map<string, ComponentParent>();
  if (!componentSchema?.uid) return parents;

  const withTrx = (qb: any) => (opts?.trx ? qb.transacting(opts.trx) : qb);

  // Use the exact same functions that create the columns
  const identifiers = strapi.db.metadata.identifiers;
  const entityIdColumn = getComponentJoinColumnEntityName(identifiers);
  const componentIdColumn = getComponentJoinColumnInverseName(identifiers);
  const componentTypeColumn = getComponentTypeColumn(identifiers);

  let pendingIds = _.uniqBy(
    componentIds.filter((id) => id !== undefined && id !== null),
    String
  );

  for (const parent of parentSchemasForComponent) {
    if (pendingIds.length === 0) break;
    if (!parent.collectionName) continue;

    // Use the exact same functions that create the tables
    const joinTableName = getComponentJoinTableName(parent.collectionName, identifiers);

    // The join table is registered as a model of its own (see createCompoLinkModel) and schema
    // sync creates every registered model, so the metadata knows whether it exists without
    // querying the database schema
    if (!strapi.db.metadata.has(joinTableName)) continue;

    for (const batch of _.chunk(pendingIds, PARENT_LOOKUP_BATCH_SIZE)) {
      try {
        const parentRows = await withTrx(strapi.db.getConnection(joinTableName))
          .select(entityIdColumn, componentIdColumn)
          .where(componentTypeColumn, componentSchema.uid)
          .whereIn(componentIdColumn, batch);

        for (const parentRow of parentRows) {
          const componentId = String(parentRow[componentIdColumn]);

          if (!parents.has(componentId)) {
            parents.set(componentId, {
              uid: parent.uid,
              table: parent.collectionName,
              parentId: parentRow[entityIdColumn],
            });
          }
        }
      } catch {
        continue;
      }
    }

    pendingIds = pendingIds.filter((id) => !parents.has(String(id)));
  }

  return parents;
};

/**
 * Find the parent entry of a component instance.
 *
 * Single-instance form of `findComponentParents`.
 *
 * - Returns the parent uid, parent table name, and parent id if found.
 * - Returns null if no parent relationship exists.
 */
const findComponentParent = async (
  componentSchema: Schema.Component,
  componentId: number | string,
  parentSchemasForComponent: (Schema.ContentType | Schema.Component)[],
  opts?: { trx?: any }
): Promise<ComponentParent | null> => {
  const parents = await findComponentParents(
    componentSchema,
    [componentId],
    parentSchemasForComponent,
    opts
  );

  return parents.get(String(componentId)) ?? null;
};

/**
 * Finds content types that contain the given component and have draft & publish enabled.
 */
const getParentSchemasForComponent = (
  componentSchema: Schema.Component
): Array<Schema.ContentType | Schema.Component> => {
  // Find direct parents in contentTypes and components
  return [...Object.values(strapi.contentTypes), ...Object.values(strapi.components)].filter(
    (schema: any) => {
      if (!schema?.attributes) return false;
      return Object.values(schema.attributes).some((attr: any) => {
        return (
          (attr.type === 'component' && attr.component === componentSchema.uid) ||
          (attr.type === 'dynamiczone' && attr.components?.includes(componentSchema.uid))
        );
      });
    }
  );
};

/**
 * Finds which of the given component instances belong to an entry of a content type with
 * draft and publish enabled, either directly or through parent components.
 *
 * Instances are resolved one nesting level at a time, so the number of queries depends on
 * the schema rather than on the number of instances.
 *
 * - Returns the ids (as strings) of the instances owned by a draft and publish entry.
 * - Instances without a parent, or owned by an entry without draft and publish, are not included.
 */
const findInstancesOwnedByDraftAndPublishEntries = async (
  componentSchema: Schema.Component,
  componentIds: (number | string)[],
  trx: any
): Promise<Set<string>> => {
  const ownedIds = new Set<string>();

  const parentSchemas = getParentSchemasForComponent(componentSchema);
  if (parentSchemas.length === 0) {
    return ownedIds;
  }

  const parents = await findComponentParents(componentSchema, componentIds, parentSchemas, {
    trx,
  });

  // Instances nested in another component, grouped by that component and its instance id
  const nestedInstances = new Map<
    UID.Component,
    Map<string, { parentId: number | string; componentIds: string[] }>
  >();

  for (const [componentId, parent] of parents) {
    if (strapi.components[parent.uid as UID.Component]) {
      const parentUid = parent.uid as UID.Component;
      const parentKey = String(parent.parentId);

      if (!nestedInstances.has(parentUid)) {
        nestedInstances.set(parentUid, new Map());
      }

      const instancesByParent = nestedInstances.get(parentUid)!;
      if (!instancesByParent.has(parentKey)) {
        instancesByParent.set(parentKey, { parentId: parent.parentId, componentIds: [] });
      }

      instancesByParent.get(parentKey)!.componentIds.push(componentId);
      continue;
    }

    if (strapi.contentTypes[parent.uid as UID.ContentType]?.options?.draftAndPublish) {
      ownedIds.add(componentId);
    }
  }

  // If the parent is a component, its own parents decide, so check them a level up
  for (const [parentUid, instancesByParent] of nestedInstances) {
    const ownedParentIds = await findInstancesOwnedByDraftAndPublishEntries(
      strapi.components[parentUid],
      Array.from(instancesByParent.values(), ({ parentId }) => parentId),
      trx
    );

    for (const parentKey of ownedParentIds) {
      instancesByParent.get(parentKey)?.componentIds.forEach((id) => ownedIds.add(id));
    }
  }

  return ownedIds;
};

/**
 * Creates a filter function for component relations that can be passed to the generic
 * unidirectional relations utility.
 *
 * A relation of a component instance is propagated to the new document version unless the
 * instance belongs to an entry with draft and publish enabled: that entry's new version gets
 * its own copy of the component.
 */
const createComponentRelationFilter = () => {
  return async (
    relations: Record<string, any>[],
    model: Schema.Component | Schema.ContentType,
    trx: any
  ): Promise<Record<string, any>[]> => {
    // Only apply component-specific filtering for components
    if (model.modelType !== 'component' || relations.length === 0) {
      return relations;
    }

    const componentSchema = model as Schema.Component;

    // Get the component ID column name using the actual component model name
    const componentIdColumn = strapi.db.metadata.identifiers.getJoinColumnAttributeIdName(
      _.snakeCase(componentSchema.modelName)
    );

    const ownedIds = await findInstancesOwnedByDraftAndPublishEntries(
      componentSchema,
      relations.map((relation) => relation[componentIdColumn]),
      trx
    );

    return relations.filter((relation) => !ownedIds.has(String(relation[componentIdColumn])));
  };
};

export {
  omitComponentData,
  assignComponentData,
  getComponents,
  createComponents,
  updateComponents,
  deleteComponents,
  deleteComponent,
  createComponentRelationFilter,
  findComponentParent,
  getParentSchemasForComponent,
};
