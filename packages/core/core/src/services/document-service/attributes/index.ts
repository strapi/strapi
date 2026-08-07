import { curry } from 'lodash/fp';

import type { UID, Modules, Schema } from '@strapi/types';

import transforms from './transforms';

// aliasing the type to make it easier to read
type Data = Modules.Documents.Params.Data.Input<UID.Schema>;

const applyTransforms = curry((schema: Schema.Schema, data: Data) => {
  // NOTE: this iterates the *data* keys, so unlike the rest of the write path it does visit keys
  // that were passed explicitly as `undefined`. The input types deliberately allow that
  // (`{ foo: undefined }` must behave like `{}` — see `processData` in `@strapi/database`), so
  // every transform registered below has to leave a non-matching value untouched rather than
  // assume a present key holds a value.
  const attributeNames = Object.keys(data) as Array<keyof typeof data & string>;

  for (const attributeName of attributeNames) {
    const value = data[attributeName];

    const attribute = schema.attributes[attributeName];

    if (!attribute) {
      continue;
    }

    const transform = transforms[attribute.type];

    if (transform) {
      const attributeContext = { attributeName, attribute };

      data[attributeName] = transform(value, attributeContext);
    }
  }

  return data;
});

export { applyTransforms };
