import transforms from './transforms';
import type { Common, Schema } from '../../../types';
import { Data } from '../types/params';

const applyTransforms = (
  data: Record<string, unknown>,
  context: {
    contentType: Schema.ContentType;
  }
) => {
  const { contentType } = context;

  for (const attributeName of Object.keys(data)) {
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
