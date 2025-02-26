import createBuilder from './schema-builder';
import { getService } from '../utils';

export const updateSchema = async (schema: any) => {
  const builder = createBuilder();
  const apiHandler = strapi.plugin('content-type-builder').service('api-handler');

  const { components, contentTypes } = schema;

  // we pre create empty types
  for (const contentType of contentTypes) {
    if (contentType.action === 'create') {
      builder.createContentType({
        ...contentType,
        attributes: {},
      });
    }
  }

  // we pre create empty types
  for (const component of components) {
    if (component.action === 'create') {
      builder.createComponent({
        ...component,
        attributes: {},
      });
    }
  }

  for (const contentType of contentTypes) {
    const { action, uid } = contentType;

    if (action === 'create') {
      builder.createContentTypeAttributes(
        uid,
        contentType.attributes.reduce((acc: any, attr: any) => {
          acc[attr.name] = attr.properties;
          return acc;
        }, {})
      );

      await getService('content-types').generateAPI({
        displayName: contentType!.displayName || contentType!.info.displayName,
        singularName: contentType!.singularName,
        pluralName: contentType!.pluralName,
        kind: contentType!.kind,
      });
    }

    if (action === 'update') {
      builder.editContentType({
        ...contentType,
        attributes: contentType.attributes.reduce((acc: any, attr: any) => {
          // NOTE: handle renaming migrations here by comparing attr name & attr.properties.name

          if (attr.action === 'delete') {
            return acc;
          }

          acc[attr.name] = attr.properties;
          return acc;
        }, {}),
      });
    }

    if (action === 'delete') {
      builder.deleteContentType(uid);
      await apiHandler.backup(uid);
    }
  }

  for (const component of components) {
    const { action, uid } = component;

    if (action === 'create') {
      builder.createComponentAttributes(
        uid,
        component.attributes.reduce((acc: any, attr: any) => {
          acc[attr.name] = attr.properties;
          return acc;
        }, {})
      );
    }

    if (action === 'update') {
      builder.editComponent({
        ...component,
        attributes: component.attributes.reduce((acc: any, attr: any) => {
          if (attr.action === 'delete') {
            return acc;
          }

          acc[attr.name] = attr.properties;
          return acc;
        }, {}),
      });
    }

    if (action === 'delete') {
      builder.deleteComponent(uid);
    }
  }

  const APIsToDelete = contentTypes
    .filter((ct: any) => ct.action === 'delete')
    .map((ct: any) => ct.uid);

  await builder.writeFiles();

  try {
    for (const uid of APIsToDelete) {
      await apiHandler.clear(uid);
    }
  } catch (error) {
    strapi.log.error(error);
    for (const uid of APIsToDelete) {
      await apiHandler.rollback(uid);
    }
  }

  for (const contentType of contentTypes) {
    if (contentType.action === 'delete') {
      strapi.eventHub.emit('content-type.delete', {
        contentType: builder.contentTypes.get(contentType.uid),
      });
    }

    if (contentType.action === 'update') {
      strapi.eventHub.emit('content-type.update', {
        contentType: builder.contentTypes.get(contentType.uid),
      });
    }

    if (contentType.action === 'create') {
      strapi.eventHub.emit('content-type.create', {
        contentType: builder.contentTypes.get(contentType.uid),
      });
    }
  }

  for (const component of components) {
    if (component.action === 'delete') {
      strapi.eventHub.emit('component.delete', {
        component: builder.components.get(component.uid),
      });
    }

    if (component.action === 'update') {
      strapi.eventHub.emit('component.update', {
        component: builder.components.get(component.uid),
      });
    }

    if (component.action === 'create') {
      strapi.eventHub.emit('component.create', {
        component: builder.components.get(component.uid),
      });
    }
  }
};
