import { Model } from '@strapi/database';
import { Schema, Attribute } from '@strapi/types';
import { createId } from '@paralleldrive/cuid2';
import assert from 'node:assert';
import _ from 'lodash/fp';

import { transformComponentAttribute } from './components';
import { transformDynamicZoneAttribute } from './dynamic-zones';
import { transformRelationAttribute } from './relations';
import { createCompoLinkModel } from './component-link-model';
import { transformMediaAttribute } from './media';
import type { Context } from './types';

const transformAttribute = (name: string, attribute: Attribute.Any) => {
  switch (attribute.type) {
    case 'media': {
      return transformMediaAttribute(attribute);
    }
    default: {
      return attribute;
    }
  }
};

const transformAttributes = (contentType: Schema.ContentType) => {
  return Object.keys(contentType.attributes! || {}).reduce((attrs, attrName) => {
    return {
      ...attrs,
      [attrName]: transformAttribute(attrName, contentType.attributes[attrName]!),
    };
  }, {});
};

const hasComponentsOrDz = (contentType: Schema.ContentType) => {
  return Object.values(contentType.attributes).some(
    ({ type }) => type === 'dynamiczone' || type === 'component'
  );
};

export const createDocumentId = createId;

export const transformContentTypesToModels = (contentTypes: Schema.ContentType[]): Model[] => {
  const ctx: Context = {
    contentTypes: contentTypes.reduce(
      (acc, contentType) => ({
        ...acc,
        [contentType.uid]: contentType,
      }),
      {}
    ),
    models: {},
  };

  _.cloneDeep(contentTypes).forEach((contentType) => {
    const documentIdAttribute: Record<string, Attribute.Any> =
      contentType.modelType === 'contentType'
        ? { documentId: { type: 'string', default: createDocumentId } }
        : {};

    // Prevent user from creating a documentId attribute
    const reservedAttributeNames = ['documentId', 'document_id', 'id'];
    reservedAttributeNames.forEach((reservedAttributeName) => {
      if (reservedAttributeName in contentType.attributes) {
        throw new Error(
          `The attribute "${reservedAttributeName}" is reserved and cannot be used in a model` +
            `Please rename "${contentType.modelName}" attribute "${reservedAttributeName}" to something else.`
        );
      }
    });

    if (hasComponentsOrDz(contentType)) {
      const compoLinkModel = createCompoLinkModel(contentType);
      ctx.models[compoLinkModel.uid] = compoLinkModel;
    }

    assert(contentType.collectionName, 'Collection name is required');

    ctx.models[contentType.uid] = {
      uid: contentType.uid,
      singularName: contentType.modelName,
      tableName: contentType.collectionName,
      attributes: {
        id: {
          type: 'increments',
        },
        ...documentIdAttribute,
        ...transformAttributes(contentType),
      },
    };
  });

  Object.keys(ctx.models).forEach((modelUID) => {
    const model = ctx.models[modelUID];

    for (const [attributeName, attribute] of Object.entries(model.attributes)) {
      try {
        // @ts-expect-error - type is not correct
        if (attribute.type === 'component') {
          // @ts-expect-error - type is not correct
          model.attributes[attributeName] = transformComponentAttribute(
            attributeName,
            attribute,
            model
          );
          // @ts-expect-error - type is not correct
        } else if (attribute.type === 'dynamiczone') {
          // @ts-expect-error - type is not correct
          model.attributes[attributeName] = transformDynamicZoneAttribute(attributeName, model);
        } else if (attribute.type === 'relation') {
          transformRelationAttribute(attributeName, attribute, model, ctx);
        }
      } catch (error) {
        console.log(error);
        if (error instanceof Error) {
          throw new Error(
            `Error on attribute ${attributeName} in model ${model.singularName}(${model.uid}): ${error.message}`
          );
        }
      }
    }
  });

  return Object.values(ctx.models);
};
