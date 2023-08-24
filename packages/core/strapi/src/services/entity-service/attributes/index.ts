import transforms from './transforms';
import type { Schema } from '../../../types';

const applyTransforms = (
  data: Record<string, unknown>,
  context: {
    contentType: Schema.ContentType;
  }
) => {
  const { contentType } = context;

  const entries = Object.entries(data);

  for (const [attributeName, value] of entries) {
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
