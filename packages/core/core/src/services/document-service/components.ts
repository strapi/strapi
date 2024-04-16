import _ from 'lodash';
import { has, omit, pipe, assign, curry } from 'lodash/fp';
import type { Utils, UID, Schema, Data, Modules } from '@strapi/types';
import { contentTypes as contentTypesUtils, async, errors } from '@strapi/utils';

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

    return omit(componentAttributes, data);
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

    if (!has(attributeName, data)) {
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
  dynamiczoneValues: DynamicZoneValue
) => {
  const previousValue = (await strapi.db
    .query(uid)
    .load(entityToUpdate, attributeName)) as DynamicZoneValue;

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

  type IdsToDelete = DynamicZoneValue;

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
const createComponent = async <TUID extends UID.Component>(uid: TUID, data: Input<TUID>) => {
  const schema = strapi.getModel(uid);

  const componentData = await createComponents(uid, data);

  const transform = pipe(
    // Make sure we don't save the component with a pre-defined ID
    omit('id'),
    assignComponentData(schema, componentData)
  );

  return strapi.db.query(uid).create({ data: transform(data) });
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
    return pipe(omitComponentData(schema), assign(componentData))(data);
  }
);

export {
  omitComponentData,
  assignComponentData,
  getComponents,
  createComponents,
  updateComponents,
  deleteComponents,
  deleteComponent,
};
