import _ from 'lodash';
import slugify from '@sindresorhus/slugify';

import { LoadedStrapi as Strapi, UID, Attribute } from '@strapi/types';

export default ({ strapi }: { strapi: Strapi }) => ({
  async generateUIDField({
    contentTypeUID,
    field,
    data,
    locale,
  }: {
    contentTypeUID: UID.ContentType;
    field: string;
    data: Record<string, any>;
    locale: string;
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
    locale: string;
  }) {
    const query = strapi.db.query(contentTypeUID);

    const possibleColisions: string[] = await query
      .findMany({
        where: {
          [field]: { $contains: value },
          locale,
        },
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
    locale,
  }: {
    contentTypeUID: UID.ContentType;
    field: string;
    value: string;
    locale: string;
  }) {
    const query = strapi.db.query(contentTypeUID);

    const count: number = await query.count({
      where: { [field]: value, locale },
    });

    if (count > 0) {
      return false;
    }

    return true;
  },
});
