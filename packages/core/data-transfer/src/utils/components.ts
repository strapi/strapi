import _ from 'lodash';
import { get, has, omit, pipe, assign } from 'lodash/fp';

import { contentTypes as contentTypesUtils, mapAsync, errors } from '@strapi/utils';
import type { Attribute, Common, Schema, Utils, EntityService, LoadedStrapi } from '@strapi/types';

type LoadedComponents<TUID extends Common.UID.Schema> = Attribute.GetValues<
  TUID,
  Attribute.GetKeysByType<TUID, 'component' | 'dynamiczone'>
>;

type ComponentValue = Attribute.GetValue<
  Attribute.Component<Common.UID.Component, false> | Attribute.Component<Common.UID.Component, true>
>;

type ComponentBody = {
  [key: string]: Attribute.GetValue<
    | Attribute.Component<Common.UID.Component, false>
    | Attribute.Component<Common.UID.Component, true>
    | Attribute.DynamicZone
  >;
};

const isDialectMySQL = () => strapi.db?.dialect.client === 'mysql';

function omitComponentData(
  contentType: Schema.ContentType,
  data: EntityService.Params.Data.Input<Schema.ContentType['uid']>
): Partial<EntityService.Params.Data.Input<Schema.ContentType['uid']>>;
function omitComponentData(
  contentType: Schema.Component,
  data: EntityService.Params.Data.Input<Schema.Component['uid']>
): Partial<EntityService.Params.Data.Input<Schema.Component['uid']>>;
function omitComponentData(
  contentType: Schema.ContentType | Schema.Component,
  data: EntityService.Params.Data.Input<Schema.ContentType['uid'] | Schema.Component['uid']>
): Partial<EntityService.Params.Data.Input<Schema.ContentType['uid'] | Schema.Component['uid']>> {
  const { attributes } = contentType;
  const componentAttributes = Object.keys(attributes).filter((attributeName) =>
    contentTypesUtils.isComponentAttribute(attributes[attributeName])
  );

  return omit(componentAttributes, data);
}

// NOTE: we could generalize the logic to allow CRUD of relation directly in the DB layer
const createComponents = async <
  TUID extends Common.UID.Schema,
  TData extends EntityService.Params.Data.Input<TUID>
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
        const components = (await mapAsync(
          componentValue,
          (value: any) => createComponent(componentUID, value),
          { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
        )) as Attribute.GetValue<Attribute.Component<Common.UID.Component, true>>;

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
          componentValue as EntityService.Params.Data.Input<Common.UID.Component>
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
      ] as EntityService.Params.Attribute.GetValue<Attribute.DynamicZone>;

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
      componentBody[attributeName] = await mapAsync(
        dynamiczoneValues,
        createDynamicZoneComponents,
        { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
      );

      continue;
    }
  }

  return componentBody;
};

const getComponents = async <TUID extends Common.UID.Schema>(
  uid: TUID,
  entity: { id: EntityService.Params.Attribute.ID }
): Promise<LoadedComponents<TUID>> => {
  const componentAttributes = contentTypesUtils.getComponentAttributes(strapi.getModel(uid));

  if (_.isEmpty(componentAttributes)) {
    return {} as LoadedComponents<TUID>;
  }

  return strapi.query(uid).load(entity, componentAttributes) as Promise<LoadedComponents<TUID>>;
};

/*
  delete old components
  create or update
*/
const updateComponents = async <
  TUID extends Common.UID.Schema,
  TData extends Partial<EntityService.Params.Data.Input<TUID>>
>(
  uid: TUID,
  entityToUpdate: { id: EntityService.Params.Attribute.ID },
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
      ] as Attribute.GetValue<Attribute.Component>;

      await deleteOldComponents(uid, componentUID, entityToUpdate, attributeName, componentValue);

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        const components = (await mapAsync(
          componentValue,
          (value: any) => updateOrCreateComponent(componentUID, value),
          { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
        )) as Attribute.GetValue<Attribute.Component<Common.UID.Component, true>>;

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
      ] as Attribute.GetValue<Attribute.DynamicZone>;

      await deleteOldDZComponents(uid, entityToUpdate, attributeName, dynamiczoneValues);

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
      componentBody[attributeName] = await mapAsync(
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
  id: EntityService.Params.Attribute.ID;
}): EntityService.Params.Attribute.ID & string => {
  if (typeof id === 'string') {
    return id;
  }

  return `${id}`;
};

const deleteOldComponents = async <TUID extends Common.UID.Schema>(
  uid: TUID,
  componentUID: Common.UID.Component,
  entityToUpdate: { id: EntityService.Params.Attribute.ID },
  attributeName: string,
  componentValue: Attribute.GetValue<Attribute.Component>
) => {
  const previousValue = (await strapi
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

const deleteOldDZComponents = async <TUID extends Common.UID.Schema>(
  uid: TUID,
  entityToUpdate: { id: EntityService.Params.Attribute.ID },
  attributeName: string,
  dynamiczoneValues: Attribute.GetValue<Attribute.DynamicZone>
) => {
  const previousValue = (await strapi
    .query(uid)
    .load(entityToUpdate, attributeName)) as Attribute.GetValue<Attribute.DynamicZone>;

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

  type IdsToDelete = Attribute.GetValue<Attribute.DynamicZone>;

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

const deleteComponents = async <
  TUID extends Common.UID.Schema,
  TEntity extends Attribute.GetValues<TUID>
>(
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
        value = await strapi.query(uid).load(entityToDelete, attributeName);
      } else {
        value = entityToDelete[attributeName as keyof TEntity];
      }

      if (!value) {
        continue;
      }

      if (attribute.type === 'component') {
        const { component: componentUID } = attribute;
        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        await mapAsync(
          _.castArray(value),
          (subValue: any) => deleteComponent(componentUID, subValue),
          {
            concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity,
          }
        );
      } else {
        // delete dynamic zone components
        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        await mapAsync(
          _.castArray(value),
          (subValue: any) => deleteComponent(subValue.__component, subValue),
          { concurrency: isDialectMySQL() && !strapi.db?.inTransaction() ? 1 : Infinity }
        );
      }

      continue;
    }
  }
};

const cloneComponents = async <TUID extends Common.UID.Schema>(
  uid: TUID,
  entityToClone: { id: EntityService.Params.Attribute.ID },
  data: EntityService.Params.Data.Input<TUID>
) => {
  const { attributes = {} } = strapi.getModel(uid);

  const componentBody: ComponentBody = {};
  const componentData = await getComponents(uid, entityToClone);

  for (const attributeName of Object.keys(attributes)) {
    const attribute = attributes[attributeName];

    // If the attribute is not set or on the component to clone, skip it
    if (!has(attributeName, data) && !has(attributeName, componentData)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = (
        attributeName in data
          ? data[attributeName as keyof typeof data]
          : componentData[attributeName as keyof typeof componentData]
      ) as ComponentValue;

      if (componentValue === null) {
        continue;
      }

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
        const components = (await mapAsync(
          componentValue,
          (value: any) => cloneComponent(componentUID, value),
          { concurrency: isDialectMySQL() ? 1 : Infinity }
        )) as Attribute.GetValue<Attribute.Component<Common.UID.Component, true>>;

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
        const component = await cloneComponent(componentUID, componentValue);
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
      const dynamiczoneValues = has(attributeName, data)
        ? data[attributeName as keyof typeof data]
        : componentData[attributeName as keyof typeof componentData];

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }
      // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
      componentBody[attributeName] = await mapAsync(
        dynamiczoneValues,
        async (value: any) => {
          const { id } = await cloneComponent(value.__component, value);
          return {
            id,
            __component: value.__component,
            __pivot: {
              field: attributeName,
            },
          };
        },
        { concurrency: isDialectMySQL() ? 1 : Infinity }
      );
      continue;
    }
  }

  return componentBody;
};
/** *************************
    Component queries
************************** */

// components can have nested compos so this must be recursive
const createComponent = async <TUID extends Common.UID.Component>(
  uid: TUID,
  data: EntityService.Params.Data.Input<TUID>
) => {
  const model = strapi.getModel(uid);

  const componentData = await createComponents(uid, data);
  const transform = pipe(
    // Make sure we don't save the component with a pre-defined ID
    omit('id'),
    // Remove the component data from the original data object ...
    (payload) => omitComponentData(model, payload),
    // ... and assign the newly created component instead
    assign(componentData)
  );

  return strapi.query(uid).create({ data: transform(data) });
};

// components can have nested compos so this must be recursive
const updateComponent = async <TUID extends Common.UID.Component>(
  uid: TUID,
  componentToUpdate: { id: EntityService.Params.Attribute.ID },
  data: EntityService.Params.Data.Input<TUID>
) => {
  const model = strapi.getModel(uid);

  const componentData = await updateComponents(uid, componentToUpdate, data);

  return strapi.query(uid).update({
    where: {
      id: componentToUpdate.id,
    },
    data: Object.assign(omitComponentData(model, data), componentData),
  });
};

const updateOrCreateComponent = <TUID extends Common.UID.Component>(
  componentUID: TUID,
  value: EntityService.Params.Data.Input<TUID>
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

const deleteComponent = async <TUID extends Common.UID.Component>(
  uid: TUID,
  componentToDelete: Attribute.GetValues<TUID>
) => {
  await deleteComponents(uid, componentToDelete);
  await strapi.query(uid).delete({ where: { id: componentToDelete.id } });
};

const cloneComponent = async <TUID extends Common.UID.Component>(
  uid: TUID,
  data: EntityService.Params.Data.Input<TUID>
) => {
  const model = strapi.getModel(uid);

  if (!('id' in data) || typeof data.id === 'undefined') {
    return createComponent(uid, data);
  }

  const componentData = await cloneComponents(uid, { id: data.id }, data);
  const transform = pipe(
    // Make sure we don't save the component with a pre-defined ID
    omit('id'),
    // Remove the component data from the original data object ...
    (payload) => omitComponentData(model, payload),
    // ... and assign the newly created component instead
    assign(componentData)
  );

  return strapi.query(uid).clone(data.id, { data: transform(data) });
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
  strapi: LoadedStrapi;
  data: any;
  contentType: Schema.ContentType;
}): Common.UID.Schema | undefined => {
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
      const attribute: Attribute.Any = cType.attributes[path];

      if (attribute.type === 'component') {
        cType = strapi.getModel(attribute.component);
      }

      if (attribute.type === 'dynamiczone') {
        cType = ({ __component }: { __component: Common.UID.Component }) =>
          strapi.getModel(__component);
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
  cloneComponents,
  resolveComponentUID,
};
