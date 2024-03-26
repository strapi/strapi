import _ from 'lodash';
import slugify from '@sindresorhus/slugify';

import { LoadedStrapi as Strapi, UID, Attribute } from '@strapi/types';

export default ({ strapi }: { strapi: Strapi }) => ({
  async generateUIDField({
    contentTypeUID,
    field,
    data,
  }: {
    contentTypeUID: UID.ContentType;
    field: string;
    data: Record<string, any>;
  }) {
    const contentType = strapi.contentTypes[contentTypeUID];
    const { attributes } = contentType;

    const { targetField, default: defaultValue, options } = attributes[field] as Attribute.UID;
    // @ts-expect-error targetField can be undefined
    const targetValue = _.get(data, targetField);

    if (!_.isEmpty(targetValue)) {
      return this.findUniqueUID({
        contentTypeUID,
        field,
        value: slugify(targetValue, options),
      });
    }

    return this.findUniqueUID({
      contentTypeUID,
      field,
      value: slugify(defaultValue || contentType.modelName, options),
    });
  },

  async findUniqueUID({
    contentTypeUID,
    field,
    value,
  }: {
    contentTypeUID: UID.ContentType;
    field: string;
    value: string;
  }) {
    const query = strapi.db.query(contentTypeUID);

    const possibleColisions: string[] = await query
      .findMany({
        where: { [field]: { $contains: value } },
      })
      .then((results: any) => results.map((result: any) => result[field]));

    if (possibleColisions.length === 0) {
      return value;
    }

    let i = 1;
    let tmpUId = `${value}-${i}`;
    while (possibleColisions.includes(tmpUId)) {
      i += 1;
      tmpUId = `${value}-${i}`;
    }

    return tmpUId;
  },

  async checkUIDAvailability({
    contentTypeUID,
    field,
    value,
  }: {
    contentTypeUID: UID.ContentType;
    field: string;
    value: string;
  }) {
    const query = strapi.db.query(contentTypeUID);

    const count: number = await query.count({
      where: { [field]: value },
    });

    if (count > 0) {
      return false;
    }

    return true;
  },
});
