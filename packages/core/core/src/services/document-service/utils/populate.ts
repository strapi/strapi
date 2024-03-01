import { Public } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

// We want to build a populate object based on the schema
export const getDeepPopulate = (uid: Public.UID.Schema) => {
  const model = strapi.getModel(uid);
  const attributes = Object.entries(model.attributes);

  return attributes.reduce((acc: any, [attributeName, attribute]) => {
    switch (attribute.type) {
      case 'relation': {
        // TODO: Should this just be a plain list?
        // Ignore createdBy, updatedBy, ...
        const isVisible = contentTypes.isVisibleAttribute(model, attributeName);
        if (isVisible) {
          acc[attributeName] = { fields: ['document_id', 'locale'] };
        }
        break;
      }

      case 'media': {
        acc[attributeName] = { fields: ['id'] };
        break;
      }

      case 'component': {
        const populate = getDeepPopulate(attribute.component);
        acc[attributeName] = { populate };
        break;
      }

      case 'dynamiczone': {
        // Use fragments to populate the dynamic zone components
        const populatedComponents = (attribute.components || []).reduce(
          (acc: any, componentUID: Public.UID.Component) => {
            acc[componentUID] = { populate: getDeepPopulate(componentUID) };
            return acc;
          },
          {}
        );

        acc[attributeName] = { on: populatedComponents };
        break;
      }
      default:
        break;
    }

    return acc;
  }, {});
};
