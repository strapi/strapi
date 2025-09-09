// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { Schema } from '../../types/schema';

import type { ContentType, Component, AnyAttribute } from '../../../../../types';

const transformAttributesFromCTBToChat = (attributes: AnyAttribute[]) => {
  return attributes.reduce(
    (acc, attribute) => {
      const { name, ...rest } = attribute;

      return {
        ...acc,
        [name]: rest,
      };
    },
    {} as Record<string, Omit<AnyAttribute, 'name'>>
  );
};

export const transformCTBToChat = (schema: ContentType | Component): Schema => {
  if (schema.modelType === 'component') {
    return {
      category: schema.category,
      kind: 'component',
      action: 'create',
      modelType: 'component',
      description: schema.info.description,
      name: schema.info.displayName,

      uid: schema.uid as any,
      attributes: transformAttributesFromCTBToChat(schema.attributes),
      // @ts-expect-error - injected from previous ai messages
      sources: schema.sources,
    } as any;
  }

  return {
    kind: schema.kind,
    modelType: schema.modelType,
    description: schema.info.description,
    action: 'create',
    name: schema.info.pluralName,
    uid: schema.uid as any,
    attributes: transformAttributesFromCTBToChat(schema.attributes),
    // @ts-expect-error - injected from previous ai messages
    sources: schema.sources,
    options: {
      draftAndPublish: schema.options?.draftAndPublish,
      localized: false,
    },
  } as any;
};
