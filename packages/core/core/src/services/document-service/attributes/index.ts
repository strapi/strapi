import type { UID, Modules, Schema } from '@strapi/types';

import transforms from './transforms';

// aliasing the type to make it easier to read
type Data = Modules.Documents.Params.Data.Input<UID.Schema>;

type ApplyTransformsOptions = {
  skipAttributeNames?: ReadonlySet<string>;
};

const applyTransforms = (
  schema: Schema.Schema,
  data: Data,
  { skipAttributeNames }: ApplyTransformsOptions = {}
) => {
  const attributeNames = Object.keys(data) as Array<keyof typeof data & string>;

  for (const attributeName of attributeNames) {
    const value = data[attributeName];

    const attribute = schema.attributes[attributeName];

    if (!attribute || skipAttributeNames?.has(attributeName)) {
      continue;
    }

    const transform = transforms[attribute.type];

    if (transform) {
      const attributeContext = { attributeName, attribute };

      data[attributeName] = transform(value, attributeContext);
    }
  }

  return data;
};

export { applyTransforms };
