import type { ContentType, Component, AnyAttribute } from '../../../../../types';
import type { Schema } from '../../types/schema';

type SchemaWithSources = (ContentType | Component) & { sources?: unknown };

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

export const transformCTBToChat = (schema: SchemaWithSources): Schema => {
  if (schema.modelType === 'component') {
    return {
      category: schema.category,
      kind: 'component',
      action: 'create',
      modelType: 'component',
      description: schema.info.description,
      name: schema.info.displayName,

      uid: schema.uid,
      attributes: transformAttributesFromCTBToChat(schema.attributes),
      sources: schema.sources,
    } satisfies Schema;
  }

  return {
    kind: schema.kind,
    modelType: schema.modelType,
    description: schema.info.description,
    action: 'create',
    name: schema.info.pluralName,
    uid: schema.uid,
    ...(schema.plugin ? { plugin: schema.plugin } : {}),
    attributes: transformAttributesFromCTBToChat(schema.attributes),
    sources: schema.sources,
    options: {
      draftAndPublish: schema.options?.draftAndPublish,
      localized: false,
    },
  } satisfies Schema;
};
