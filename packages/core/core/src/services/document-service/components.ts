import _, { assign, curry, has, isEmpty, isEqual, isNil, isPlainObject, omit } from 'lodash';
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
      const previousValue = await deleteOldComponents(
        uid,
        componentUID,
        entityToUpdate,
        attributeName,
        componentValue
      );

      const previousComponents = _.castArray(previousValue ?? []).filter(
        (component) => !isNil(component)
      ) as Record<string, unknown>[];
      const previousById = new Map(
        previousComponents.map((component) => [pickStringifiedId(component as any), component])
      );
      const getPrevious = (value: any) =>
        value && has(value, 'id') && !isNil(value.id)
          ? previousById.get(pickStringifiedId(value))
          : undefined;

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        const results: Array<ComponentWriteResult | null> = await async.map(
          componentValue,
          (value: any) => updateOrCreateComponent(componentUID, value, getPrevious(value))
        );
        const components = results.filter(
          (result): result is ComponentWriteResult => !isNil(result)
        );

        // The join rows are already right when no component changed and the list kept its order
        const sameList = isEqual(
          components.map(pickStringifiedId),
          previousComponents.map((component) => pickStringifiedId(component as any))
        );
        if (sameList && components.every((component) => !component.changed)) {
          continue;
        }

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
        const component = await updateOrCreateComponent(
          componentUID,
          componentValue,
          getPrevious(componentValue)
        );

        const previousId = previousComponents[0]
          ? pickStringifiedId(previousComponents[0] as any)
          : null;
        const currentId = component ? pickStringifiedId(component) : null;
        if (previousId === currentId && (!component || !component.changed)) {
          continue;
        }

        componentBody[attributeName] = (
          component
            ? {
                id: component.id,
                __pivot: {
                  field: attributeName,
                  component_type: componentUID,
                },
              }
            : null
        ) as ComponentValue;
      }
    } else if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[attributeName as keyof TData] as DynamicZoneValue;

      const previousValue = await deleteOldDZComponents(
        uid,
        entityToUpdate,
        attributeName,
        dynamiczoneValues,
        attribute.components
      );

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      const toKey = (value: {
        id: Modules.EntityService.Params.Attribute.ID;
        __component: string;
      }) => `${value.__component}:${pickStringifiedId(value)}`;
      const previousComponents = _.castArray(previousValue ?? []).filter(
        (component) => !isNil(component)
      );
      const previousByKey = new Map(
        previousComponents.map((component) => [toKey(component), component])
      );

      // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
      const components: Array<ComponentWriteResult & { __component: UID.Component }> =
        await async.map(dynamiczoneValues, async (value: any) => {
          const previous =
            has(value, 'id') && !isNil(value.id) ? previousByKey.get(toKey(value)) : undefined;
          const result = await updateOrCreateComponent(value.__component, value, previous);

          return { ...result, __component: value.__component };
        });

      // The join rows are already right when no component changed and the zone kept its order
      const sameList = isEqual(components.map(toKey), previousComponents.map(toKey));
      if (sameList && components.every((component) => !component.changed)) {
        continue;
      }

      componentBody[attributeName] = components.map(({ id, __component }) => {
        return {
          id,
          __component,
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

/**
 * Result of writing one component: its id, and whether anything was written for it.
 */
type ComponentWriteResult = {
  id: Modules.EntityService.Params.Attribute.ID;
  changed: boolean;
};

/**
 * Populate of the media attributes of a component, ids only, so that a loaded component can be
 * compared with the data sent for it (see isComponentUnchanged).
 */
const getMediaPopulate = (componentUID: UID.Component) => {
  const { attributes = {} } = strapi.getModel(componentUID);

  const populate = Object.entries(attributes).reduce(
    (acc, [attributeName, attribute]) => {
      if (attribute.type === 'media') {
        acc[attributeName] = { select: ['id'] };
      }

      return acc;
    },
    {} as Record<string, { select: string[] }>
  );

  return isEmpty(populate) ? undefined : populate;
};

const getComponentLoadParams = (componentUID: UID.Component) => {
  const populate = getMediaPopulate(componentUID);

  return populate ? { populate } : undefined;
};

const getDynamicZoneLoadParams = (componentUIDs: UID.Component[]) => {
  // Every component of the zone has to be listed: the DB layer only returns the listed types
  const on = componentUIDs.reduce(
    (acc, componentUID) => {
      const populate = getMediaPopulate(componentUID);
      acc[componentUID] = populate ? { populate } : {};

      return acc;
    },
    {} as Record<string, Record<string, unknown>>
  );

  return Object.values(on).some((fragment) => !isEmpty(fragment)) ? { on } : undefined;
};

/**
 * A relation or media sent as `{ connect: [], disconnect: [] }` leaves the stored value as it is.
 */
const isRelationInputNoop = (value: unknown): boolean => {
  if (!isPlainObject(value) || has(value, 'set')) {
    return false;
  }

  const { connect, disconnect, ...rest } = value as Record<string, unknown>;

  return (
    isEmpty(connect) && isEmpty(disconnect) && Object.keys(rest).every((key) => key === 'options')
  );
};

/**
 * Ids of a media value, as loaded (`{ id }`, `[{ id }]`) or as sent (ids, `{ id }` objects, a `set`).
 * Returns null when they cannot be told.
 */
const toMediaIds = (value: unknown): string[] | null => {
  if (isNil(value)) {
    return [];
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    const ids = value.map((item) => (isPlainObject(item) ? (item as { id?: unknown }).id : item));

    return ids.every((id) => typeof id === 'number' || typeof id === 'string')
      ? ids.map(String)
      : null;
  }

  if (isPlainObject(value)) {
    if (has(value, 'set')) {
      return toMediaIds((value as { set: unknown }).set);
    }

    if (has(value, 'id') && !has(value, 'connect') && !has(value, 'disconnect')) {
      return toMediaIds([value]);
    }
  }

  return null;
};

const toComparableNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toComparableBigInt = (value: unknown): string | null => {
  try {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'number' && Number.isInteger(value)) {
      return BigInt(value).toString();
    }

    if (typeof value === 'string' && value.trim() !== '') {
      return BigInt(value.trim()).toString();
    }
  } catch {
    // not a big integer
  }

  return null;
};

const toComparableDateTime = (value: unknown): number | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    // timestamps are loaded as epoch strings
    const time = /^\d+$/.test(value) ? Number(value) : new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }

  return null;
};

const toComparableDate = (value: unknown): string | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  return null;
};

const toComparableTime = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{2}:\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/);
  if (!match) {
    return null;
  }

  const [, hoursMinutes, seconds = '00', milliseconds = '000'] = match;

  return `${hoursMinutes}:${seconds}.${milliseconds.padEnd(3, '0')}`;
};

const toComparableJson = (value: unknown): unknown => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
};

const isScalarUnchanged = (
  attribute: Schema.Attribute.AnyAttribute,
  stored: unknown,
  incoming: unknown
): boolean => {
  if (isNil(stored) || isNil(incoming)) {
    return isNil(stored) && isNil(incoming);
  }

  switch (attribute.type) {
    case 'string':
    case 'text':
    case 'richtext':
    case 'email':
    case 'enumeration':
    case 'uid':
      return typeof incoming === 'string' && String(stored) === incoming;
    case 'boolean':
      return typeof incoming === 'boolean' && stored === incoming;
    case 'integer':
    case 'float':
    case 'decimal': {
      const a = toComparableNumber(stored);
      return a !== null && a === toComparableNumber(incoming);
    }
    case 'biginteger': {
      const a = toComparableBigInt(stored);
      return a !== null && a === toComparableBigInt(incoming);
    }
    case 'date': {
      const a = toComparableDate(stored);
      return a !== null && a === toComparableDate(incoming);
    }
    case 'time': {
      const a = toComparableTime(stored);
      return a !== null && a === toComparableTime(incoming);
    }
    case 'datetime':
    case 'timestamp': {
      const a = toComparableDateTime(stored);
      return a !== null && a === toComparableDateTime(incoming);
    }
    case 'json':
    case 'blocks':
      return isEqual(toComparableJson(stored), toComparableJson(incoming));
    default:
      // passwords and unknown types: assume a change
      return false;
  }
};

/**
 * Whether the data sent for a component leaves it as it is stored. Nested components and dynamic
 * zones are not compared here: updateComponents only reports the ones that changed, and the caller
 * checks that it reported none. Anything that cannot be compared with certainty counts as a change.
 */
const isComponentUnchanged = (
  schema: Schema.Schema,
  stored: Record<string, unknown>,
  data: Record<string, unknown>
): boolean => {
  return Object.entries(schema.attributes).every(([attributeName, attribute]) => {
    if (!has(data, attributeName) || contentTypesUtils.isComponentAttribute(attribute)) {
      return true;
    }

    const incoming = data[attributeName];

    if (attribute.type === 'relation') {
      return isRelationInputNoop(incoming);
    }

    if (!has(stored, attributeName)) {
      return false;
    }

    if (attribute.type === 'media') {
      if (isRelationInputNoop(incoming)) {
        return true;
      }

      const storedIds = toMediaIds(stored[attributeName]);
      const incomingIds = toMediaIds(incoming);

      return storedIds !== null && incomingIds !== null && isEqual(storedIds, incomingIds);
    }

    return isScalarUnchanged(attribute, stored[attributeName], incoming);
  });
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
    .load(entityToUpdate, attributeName, getComponentLoadParams(componentUID))) as ComponentValue;
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

  return previousValue;
};

const deleteOldDZComponents = async <TUID extends UID.Schema>(
  uid: TUID,
  entityToUpdate: { id: Modules.EntityService.Params.Attribute.ID },
  attributeName: string,
  dynamiczoneValues: DynamicZoneValue,
  componentUIDs: UID.Component[]
) => {
  const previousValue = (await strapi.db
    .query(uid)
    .load(
      entityToUpdate,
      attributeName,
      getDynamicZoneLoadParams(componentUIDs)
    )) as DynamicZoneValue;

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

  return previousValue;
};

type ComponentIdsByUid = Map<UID.Component, Modules.EntityService.Params.Attribute.ID[]>;

const addComponentIds = (
  groups: ComponentIdsByUid,
  componentUID: UID.Component,
  ids: Modules.EntityService.Params.Attribute.ID[]
) => {
  if (ids.length > 0) {
    groups.set(componentUID, [...(groups.get(componentUID) ?? []), ...ids]);
  }
};

/**
 * Ids of the components held by the component and dynamic zone attributes of `values`, by component uid.
 */
const groupComponentsByUid = (
  schema: Schema.Schema,
  values: Record<string, unknown>
): ComponentIdsByUid => {
  const groups: ComponentIdsByUid = new Map();

  for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
    const value = values[attributeName];

    if (isNil(value)) {
      continue;
    }

    const components = _.castArray(value).filter(
      (
        component
      ): component is {
        id: Modules.EntityService.Params.Attribute.ID;
        __component?: UID.Component;
      } => isPlainObject(component) && !isNil((component as { id?: unknown }).id)
    );

    if (attribute.type === 'component') {
      addComponentIds(
        groups,
        attribute.component,
        components.map((component) => component.id)
      );
    } else if (attribute.type === 'dynamiczone') {
      for (const component of components) {
        if (component.__component) {
          addComponentIds(groups, component.__component, [component.id]);
        }
      }
    }
  }

  return groups;
};

/**
 * Ids of every component under an entry or a component, by component uid, down to the deepest
 * level. Each level costs one query per component uid, whatever the number of components.
 */
const collectComponentTree = async <TUID extends UID.Schema>(
  uid: TUID,
  entity: Record<string, unknown>,
  { loadComponents = true } = {}
): Promise<ComponentIdsByUid> => {
  const tree: ComponentIdsByUid = new Map();
  const schema = strapi.getModel(uid);
  const componentAttributes = contentTypesUtils.getComponentAttributes(schema);

  if (componentAttributes.length === 0) {
    return tree;
  }

  const values = loadComponents
    ? await strapi.db.query(uid).load(entity as any, componentAttributes)
    : entity;

  let level = groupComponentsByUid(schema, values ?? {});

  while (level.size > 0) {
    const nextLevel: ComponentIdsByUid = new Map();

    for (const [componentUID, ids] of level) {
      addComponentIds(tree, componentUID, ids);

      const componentSchema = strapi.getModel(componentUID);
      const nestedAttributes = contentTypesUtils.getComponentAttributes(componentSchema);

      if (nestedAttributes.length === 0) {
        continue;
      }

      const rows: Record<string, unknown>[] = await strapi.db.query(componentUID).findMany({
        where: { id: { $in: ids } },
        select: ['id'],
        populate: Object.fromEntries(
          nestedAttributes.map((attributeName) => [
            attributeName,
            // dynamic zone items need their __component, keep every column for them
            componentSchema.attributes[attributeName].type === 'dynamiczone'
              ? true
              : { select: ['id'] },
          ])
        ),
      });

      for (const row of rows) {
        for (const [nestedUID, nestedIds] of groupComponentsByUid(componentSchema, row)) {
          addComponentIds(nextLevel, nestedUID, nestedIds);
        }
      }
    }

    level = nextLevel;
  }

  return tree;
};

const hasDeleteLifecycleSubscribers = (componentUID: UID.Component) =>
  strapi.db.lifecycles.hasSubscribers('beforeDelete', componentUID) ||
  strapi.db.lifecycles.hasSubscribers('afterDelete', componentUID);

/**
 * Deletes the components one by one, each with its own delete lifecycles.
 */
const deleteComponentsOneByOne = async <TUID extends UID.Schema, TEntity extends Data.Entity<TUID>>(
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

// Keeps every statement under the parameter limits of the databases
const DELETE_BATCH_SIZE = 500;

/**
 * Deletes every component under an entry or a component. The whole tree is removed level by level
 * with one statement per component uid and per relation attribute. When a database lifecycle
 * subscriber listens to the deletion of one of those component uids, the components are deleted
 * one by one instead, so that each of them fires its events.
 */
const deleteComponents = async <TUID extends UID.Schema, TEntity extends Data.Entity<TUID>>(
  uid: TUID,
  entityToDelete: TEntity,
  { loadComponents = true } = {}
) => {
  const tree = await collectComponentTree(uid, entityToDelete as Record<string, unknown>, {
    loadComponents,
  });

  if (tree.size === 0) {
    return;
  }

  if ([...tree.keys()].some(hasDeleteLifecycleSubscribers)) {
    await deleteComponentsOneByOne(uid, entityToDelete, { loadComponents });
    return;
  }

  await strapi.db.transaction(async ({ trx }) => {
    for (const [componentUID, ids] of tree) {
      for (const batch of _.chunk(ids, DELETE_BATCH_SIZE)) {
        await strapi.db.entityManager.deleteManyRelations(componentUID, batch, {
          transaction: trx,
        });
        await strapi.db.query(componentUID).deleteMany({ where: { id: { $in: batch } } });
      }
    }
  });
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
  data: Input<TUID>,
  previous?: Record<string, unknown>
): Promise<ComponentWriteResult | null> => {
  const schema = strapi.getModel(uid);

  const componentData = await updateComponents(uid, componentToUpdate, data);

  // Nothing to write when the component is stored as sent. updateComponents only reports the
  // nested attributes that changed, so an empty componentData means none of them did.
  if (
    previous &&
    isEmpty(componentData) &&
    isComponentUnchanged(schema, previous, data as Record<string, unknown>)
  ) {
    return { id: componentToUpdate.id, changed: false };
  }

  const component = await strapi.db.query(uid).update({
    where: {
      id: componentToUpdate.id,
    },
    data: assignComponentData(schema, componentData, data),
  });

  return component ? { id: component.id, changed: true } : null;
};

const updateOrCreateComponent = async <TUID extends UID.Component>(
  componentUID: TUID,
  value: Input<TUID>,
  previous?: Record<string, unknown>
): Promise<ComponentWriteResult | null> => {
  if (value === null) {
    return null;
  }

  // update
  if ('id' in value && typeof value.id !== 'undefined') {
    // TODO: verify the compo is associated with the entity
    return updateComponent(componentUID, { id: value.id }, value, previous);
  }

  // create
  const component = await createComponent(componentUID, value);

  return { id: component.id, changed: true };
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
  isComponentUnchanged,
  getComponents,
  createComponents,
  updateComponents,
  deleteComponents,
  deleteComponent,
  createComponentRelationFilter,
  findComponentParent,
  getParentSchemasForComponent,
};
