import type { UID, Modules, Schema } from '@strapi/types';
import transforms from './transforms';

const applyTransforms = <TUID extends UID.ContentType>(
  data: Modules.EntityService.Params.Data.Input<TUID>,
  context: {
    contentType: Schema.ContentType<TUID>;
  }
) => {
  const { contentType } = context;

  const attributeNames = Object.keys(data) as Array<keyof typeof data & string>;

  for (const attributeName of attributeNames) {
    const value = data[attributeName];

    const attribute = contentType.attributes[attributeName];

    if (!attribute) {
      continue;
    }

    const transform = transforms[attribute.type];

    if (transform) {
      const attributeContext = { ...context, attributeName, attribute };

      data[attributeName] = transform(value, attributeContext);
    }
  }

  return data;
};

export { applyTransforms };
