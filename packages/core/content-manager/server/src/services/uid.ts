import _ from 'lodash';
import slugify from '@sindresorhus/slugify';

import type { Core, Schema, UID } from '@strapi/types';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generateUIDField({
    contentTypeUID,
    field,
    data,
    locale,
  }: {
    contentTypeUID: UID.ContentType;
    field: string;
    data: Record<string, any>;
    locale?: string;
  }) {
    const contentType = strapi.contentTypes[contentTypeUID];
    const { attributes } = contentType;

    const {
      targetField,
      default: defaultValue,
      options,
    } = attributes[field] as Schema.Attribute.UID;

    // @ts-expect-error targetField can be undefined
    const targetValue = _.get(data, targetField);

    if (!_.isEmpty(targetValue)) {
      return this.findUniqueUID({
        contentTypeUID,
        field,
        value: slugify(targetValue, options),
        locale,
      });
    }

    return this.findUniqueUID({
      contentTypeUID,
      field,
      value: slugify(
        _.isFunction(defaultValue) ? defaultValue() : defaultValue || contentType.modelName,
        options
      ),
      locale,
    });
  },

  async findUniqueUID({
    contentTypeUID,
    field,
    value,
    locale,
  }: {
    contentTypeUID: UID.ContentType;
    field: string;
    value: string;
    locale?: string;
  }) {
    const foundDocuments = await strapi.documents(contentTypeUID).findMany({
      filters: {
        [field]: { $startsWith: value },
      },
      locale,
      // TODO: Check UX. When modifying an entry, it only makes sense to check for collisions with other drafts
      // However, when publishing this "available" UID might collide with another published entry
      status: 'draft',
    });

    if (!foundDocuments || foundDocuments.length === 0) {
      // If there are no documents found we can return the value as is
      return value;
    }

    let possibleCollisions: string[];
    if (!Array.isArray(foundDocuments)) {
      possibleCollisions = [foundDocuments[field]];
    } else {
      possibleCollisions = foundDocuments.map((doc: any) => doc[field]);
    }

    // If there are no documents sharing the proposed UID, we can return the value as is
    if (!possibleCollisions.includes(value)) {
      return value;
    }

    let i = 1;
    let tmpUId = `${value}-${i}`;
    while (possibleCollisions.includes(tmpUId)) {
      // While there are documents sharing the proposed UID, we need to find a new one
      // by incrementing the suffix until we find a unique one
      i += 1;
      tmpUId = `${value}-${i}`;
    }

    return tmpUId;
  },

  async checkUIDAvailability({
    contentTypeUID,
    field,
    value,
    locale,
  }: {
    contentTypeUID: UID.ContentType;
    field: string;
    value: string;
    locale?: string;
  }) {
    const documentCount = await strapi.documents(contentTypeUID).count({
      filters: {
        [field]: value,
      },
      locale,
      // TODO: Check UX. When modifying an entry, it only makes sense to check for collisions with other drafts
      // However, when publishing this "available" UID might collide with another published entry
      status: 'draft',
    });

    if (documentCount && documentCount > 0) {
      // If there are documents sharing the proposed UID, we can return false
      return false;
    }

    return true;
  },
});
