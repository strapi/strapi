import _ from 'lodash';
import utils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';

const { ApplicationError } = errors;

export const isConfigurable = (attribute: Schema.Attribute.AnyAttribute) =>
  _.get(attribute, 'configurable', true);

export const isRelation = (attribute: Schema.Attribute.AnyAttribute) =>
  attribute.type === 'relation';

/**
 * Formats a component's attributes
 */
export const formatAttributes = (model: any) => {
  const { getVisibleAttributes } = utils.contentTypes;

  // only get attributes that can be seen in the CTB
  return getVisibleAttributes(model).reduce((acc: any, key) => {
    acc[key] = formatAttribute(model.attributes[key]);
    return acc;
  }, {});
};

/**
 * Formats a component attribute
 */
export const formatAttribute = (attribute: Schema.Attribute.AnyAttribute & Record<string, any>) => {
  const { configurable, required, autoPopulate, pluginOptions } = attribute;

  if (attribute.type === 'media') {
    return {
      type: 'media',
      multiple: !!attribute.multiple,
      required: !!required,
      configurable: configurable === false ? false : undefined,
      private: !!attribute.private,
      allowedTypes: attribute.allowedTypes,
      pluginOptions,
    };
  }

  if (attribute.type === 'relation') {
    return {
      ...attribute,
      type: 'relation',
      target: attribute.target,
      targetAttribute: attribute.inversedBy || attribute.mappedBy || null,
      configurable: configurable === false ? false : undefined,
      private: !!attribute.private,
      pluginOptions,
      // TODO: remove
      autoPopulate,
    };
  }

  return attribute;
};

// TODO: move to schema builder
export const replaceTemporaryUIDs = (uidMap: any) => (schema: any) => {
  return {
    ...schema,
    attributes: Object.keys(schema.attributes).reduce((acc: any, key) => {
      const attr = schema.attributes[key];
      if (attr.type === 'component') {
        if (_.has(uidMap, attr.component)) {
          acc[key] = {
            ...attr,
            component: uidMap[attr.component],
          };

          return acc;
        }

        if (!_.has(strapi.components, attr.component)) {
          throw new ApplicationError('component.notFound');
        }
      }

      if (
        attr.type === 'dynamiczone' &&
        _.intersection(attr.components, Object.keys(uidMap)).length > 0
      ) {
        acc[key] = {
          ...attr,
          components: attr.components.map((value: any) => {
            if (_.has(uidMap, value)) return uidMap[value];

            if (!_.has(strapi.components, value)) {
              throw new ApplicationError('component.notFound');
            }

            return value;
          }),
        };

        return acc;
      }

      acc[key] = attr;
      return acc;
    }, {}),
  };
};
