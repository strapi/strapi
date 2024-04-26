import _ from 'lodash';
import { get, has, omit, pipe, assign } from 'lodash/fp';

import { contentTypes as contentTypesUtils, async, errors } from '@strapi/utils';
import type { Modules, UID, Data, Utils, Schema, Core } from '@strapi/types';

type LoadedComponents<TUID extends UID.Schema> = Data.Entity<
  TUID,
  Schema.AttributeNamesByType<TUID, 'component' | 'dynamiczone'>
>;

type ComponentValue = Schema.Attribute.Value<
  Schema.Attribute.Component<UID.Component, false> | Schema.Attribute.Component<UID.Component, true>
>;

type ComponentBody = {
  [key: string]: Schema.Attribute.Value<
    | Schema.Attribute.Component<UID.Component, false>
    | Schema.Attribute.Component<UID.Component, true>
    | Schema.Attribute.DynamicZone
  >;
};

const isDialectMySQL = () => strapi.db?.dialect.client === 'mysql';

function omitComponentData(
  contentType: Schema.ContentType,
  data: Modules.EntityService.Params.Data.Input<Schema.ContentType['uid']>
): Partial<Modules.EntityService.Params.Data.Input<Schema.ContentType['uid']>>;
function omitComponentData(
  contentType: Schema.Component,
  data: Modules.EntityService.Params.Data.Input<Schema.Component['uid']>
): Partial<Modules.EntityService.Params.Data.Input<Schema.Component['uid']>>;
function omitComponentData(
  contentType: Schema.ContentType | Schema.Component,
  data: Modules.EntityService.Params.Data.Input<Schema.ContentType['uid'] | Schema.Component['uid']>
): Partial<
  Modules.EntityService.Params.Data.Input<Schema.ContentType['uid'] | Schema.Component['uid']>
> {
  const { attributes } = contentType;
  const componentAttributes = Object.keys(attributes).filter((attributeName) =>
    contentTypesUtils.isComponentAttribute(attributes[attributeName])
  );

  return omit(componentAttributes, data);
}

// NOTE: we could generalize the logic to allow CRUD of relation directly in the DB layer
const createComponents = async <
  TUID extends UID.Schema,
  TData extends Modules.EntityService.Params.Data.Input<TUID>,
>(
  uid: TUID,
  data: TData
) => {
  const { attributes = {} } = strapi.getModel(uid);

  const componentBody: ComponentBody = {};

  const attributeNames = Object.keys(attributes);

  for (const attributeName of attributeNames) {
    const attribute = attributes[attributeName];

    if (!has(attributeName, data) || !contentTypesUtils.isComponentAttribute(attribute)) {
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

        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        const components = (await async.map(
          componentValue,
          (value: any) => createComponent(componentUID, value),
          { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
        )) as Schema.Attribute.Value<Schema.Attribute.Component<UID.Component, true>>;

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
          componentValue as Modules.EntityService.Params.Data.Input<UID.Component>
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
        createDynamicZoneComponents,
        { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
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
const updateComponents = async <
  TUID extends UID.Schema,
  TData extends Partial<Modules.EntityService.Params.Data.Input<TUID>>,
>(
  uid: TUID,
  entityToUpdate: { id: Modules.EntityService.Params.Attribute.ID },
  data: TData
) => {
  const { attributes = {} } = strapi.getModel(uid);

  const componentBody: ComponentBody = {};

  for (const attributeName of Object.keys(attributes)) {
    const attribute = attributes[attributeName];

    if (!has(attributeName, data)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = data[
        attributeName as keyof TData
      ] as Schema.Attribute.Value<Schema.Attribute.Component>;

      await deleteOldComponents(uid, componentUID, entityToUpdate, attributeName, componentValue);

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        const components = (await async.map(
          componentValue,
          (value: any) => updateOrCreateComponent(componentUID, value),
          { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
        )) as Schema.Attribute.Value<Schema.Attribute.Component<UID.Component, true>>;

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

      continue;
    }

    if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[
        attributeName as keyof TData
      ] as Schema.Attribute.Value<Schema.Attribute.DynamicZone>;

      await deleteOldDZComponents(uid, entityToUpdate, attributeName, dynamiczoneValues);

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
      componentBody[attributeName] = await async.map(
        dynamiczoneValues,
        async (value: any) => {
          const { id } = await updateOrCreateComponent(value.__component, value);

          return {
            id,
            __component: value.__component,
            __pivot: {
              field: attributeName,
            },
          };
        },
        { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
      );

      continue;
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
  componentValue: Schema.Attribute.Value<Schema.Attribute.Component>
) => {
  const previousValue = (await strapi.db
    .query(uid)
    .load(entityToUpdate, attributeName)) as ComponentValue;

  const idsToKeep = _.castArray(componentValue).filter(has('id')).map(pickStringifiedId);
  const allIds = _.castArray(previousValue).filter(has('id')).map(pickStringifiedId);

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
  dynamiczoneValues: Schema.Attribute.Value<Schema.Attribute.DynamicZone>
) => {
  const previousValue = (await strapi.db
    .query(uid)
    .load(entityToUpdate, attributeName)) as Schema.Attribute.Value<Schema.Attribute.DynamicZone>;

  const idsToKeep = _.castArray(dynamiczoneValues)
    .filter(has('id'))
    .map((v) => ({
      id: pickStringifiedId(v),
      __component: v.__component,
    }));

  const allIds = _.castArray(previousValue)
    .filter(has('id'))
    .map((v) => ({
      id: pickStringifiedId(v),
      __component: v.__component,
    }));

  idsToKeep.forEach(({ id, __component }) => {
    if (!allIds.find((el) => el.id === id && el.__component === __component)) {
      const err = new Error(
        `Some of the provided components in ${attributeName} are not related to the entity`
      );

      Object.assign(err, { status: 400 });
      throw err;
    }
  });

  type IdsToDelete = Schema.Attribute.Value<Schema.Attribute.DynamicZone>;

  const idsToDelete = allIds.reduce((acc, { id, __component }) => {
    if (!idsToKeep.find((el) => el.id === id && el.__component === __component)) {
      acc.push({ id, __component });
    }

    return acc;
  }, [] as IdsToDelete);

  if (idsToDelete.length > 0) {
    for (const idToDelete of idsToDelete) {
      const { id, __component } = idToDelete;
      await deleteComponent(__component, { id });
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
        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        await async.map(
          _.castArray(value),
          (subValue: any) => deleteComponent(componentUID, subValue),
          {
            concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity,
          }
        );
      } else {
        // delete dynamic zone components
        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        await async.map(
          _.castArray(value),
          (subValue: any) => deleteComponent(subValue.__component, subValue),
          { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
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
const createComponent = async <TUID extends UID.Component = UID.Component>(
  uid: TUID,
  data: Modules.EntityService.Params.Data.Input<TUID>
) => {
  const model = strapi.getModel(uid) as Schema.Component;

  const componentData = await createComponents(uid, data);
  const transform = pipe(
    // Make sure we don't save the component with a pre-defined ID
    omit('id'),
    // Remove the component data from the original data object ...
    (payload) => omitComponentData(model, payload),
    // ... and assign the newly created component instead
    assign(componentData)
  );

  return strapi.db.query(uid).create({ data: transform(data) });
};

// components can have nested compos so this must be recursive
const updateComponent = async <TUID extends UID.Component>(
  uid: TUID,
  componentToUpdate: { id: Modules.EntityService.Params.Attribute.ID },
  data: Modules.EntityService.Params.Data.Input<TUID>
) => {
  const model = strapi.getModel(uid) as Schema.Component;

  const componentData = await updateComponents(uid, componentToUpdate, data);

  return strapi.db.query(uid).update({
    where: {
      id: componentToUpdate.id,
    },
    data: Object.assign(omitComponentData(model, data), componentData),
  });
};

const updateOrCreateComponent = <TUID extends UID.Component>(
  componentUID: TUID,
  value: Modules.EntityService.Params.Data.Input<TUID>
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

/**
 * Resolve the component UID of an entity's attribute based
 * on a given path (components & dynamic zones only)
 */
const resolveComponentUID = ({
  paths,
  strapi,
  data,
  contentType,
}: {
  paths: string[];
  strapi: Core.Strapi;
  data: any;
  contentType: Schema.ContentType;
}): UID.Schema | undefined => {
  let value: unknown = data;
  let cType:
    | Schema.ContentType
    | Schema.Component
    | ((...opts: any[]) => Schema.ContentType | Schema.Component) = contentType;
  for (const path of paths) {
    value = get(path, value);

    // Needed when the value of cType should be computed
    // based on the next value (eg: dynamic zones)
    if (typeof cType === 'function') {
      cType = cType(value);
    }

    if (path in cType.attributes) {
      const attribute: Schema.Attribute.AnyAttribute = cType.attributes[path];

      if (attribute.type === 'component') {
        cType = strapi.getModel(attribute.component);
      }

      if (attribute.type === 'dynamiczone') {
        cType = ({ __component }: { __component: UID.Component }) => strapi.getModel(__component);
      }
    }
  }

  if ('uid' in cType) {
    return cType.uid;
  }

  return undefined;
};

export {
  omitComponentData,
  getComponents,
  createComponents,
  updateComponents,
  deleteComponents,
  deleteComponent,
  resolveComponentUID,
};
