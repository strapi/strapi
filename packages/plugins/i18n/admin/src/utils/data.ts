import {
  contentManagementUtilRemoveFieldsFromData,
  formatContentTypeData,
} from '@strapi/helper-plugin';
import { Schema, Attribute } from '@strapi/types';

import { Entity } from '../../../shared/contracts/shared';

/* -------------------------------------------------------------------------------------------------
 * cleanData
 * -----------------------------------------------------------------------------------------------*/

interface Schemas<TSchema extends Schema.ContentType> {
  contentType: TSchema;
  components: Record<string, Schema.Component>;
}

const cleanData = <
  TSchema extends Schema.ContentType,
  TData extends { [K in keyof TSchema['attributes']]: Attribute.GetValue<TSchema['attributes'][K]> }
>(
  data: TData,
  { contentType, components }: Schemas<TSchema>,
  initialLocalizations: Localization[]
) => {
  const dataWithoutPasswordsAndRelations = removePasswordAndRelationsFieldFromData(
    data,
    contentType,
    components
  );

  const dataWithLocalizations = {
    ...dataWithoutPasswordsAndRelations,
    localizations: initialLocalizations,
  };

  const cleanedClonedData = contentManagementUtilRemoveFieldsFromData(
    dataWithLocalizations,
    contentType,
    components,
    ['createdBy', 'updatedBy', 'publishedAt', 'id', 'updatedAt', 'createdAt']
  );

  return formatContentTypeData(cleanedClonedData, contentType, components);
};

const removePasswordAndRelationsFieldFromData = <
  TSchema extends Schema.ContentType,
  TData extends { [K in keyof TSchema['attributes']]: Attribute.GetValue<TSchema['attributes'][K]> }
>(
  data: TData,
  contentTypeSchema: TSchema,
  componentSchema: Record<string, Schema.Component>
) => {
  const recursiveCleanData = <
    TSchemum extends Schema.Schema,
    TDatum extends {
      [P in keyof TSchemum['attributes']]: Attribute.GetValue<TSchemum['attributes'][P]>;
    }
  >(
    datum: TDatum,
    schemum: TSchemum
  ) => {
    return Object.keys(datum).reduce((acc, current: keyof TDatum) => {
      // @ts-expect-error – TODO: fix the fact we can't assign this.
      const attribute = schemum.attributes[current] ?? { type: undefined };

      if (attribute.type === 'dynamiczone') {
        const value = datum[current] as Attribute.GetValue<Attribute.DynamicZone>;

        // @ts-expect-error – TODO: fix the fact we can't assign this.
        acc[current] = value.map((componentValue) => {
          const subCleanedData = recursiveCleanData(
            componentValue,
            componentSchema[componentValue.__component]
          );

          return subCleanedData;
        });

        return acc;
      } else if (attribute.type === 'component') {
        const { repeatable, component } = attribute;

        if (repeatable) {
          const value = (datum[current] as Attribute.GetValue<Attribute.DynamicZone>) ?? [];

          // @ts-expect-error – TODO: fix the fact we can't assign this.
          acc[current] = value.map((compoData) => {
            const subCleanedData = recursiveCleanData(compoData, componentSchema[component]);

            return subCleanedData;
          });
        } else {
          const value = (datum[current] as Attribute.GetValue<Attribute.Component>) ?? {};

          // @ts-expect-error – TODO: fix the fact we can't assign this.
          acc[current] = recursiveCleanData(value, componentSchema[component]);
        }

        return acc;
      } else if (attribute.type !== 'password' && attribute.type !== 'relation') {
        acc[current] = datum[current];
      }

      return acc;
    }, {} as TDatum);
  };

  return recursiveCleanData(data, contentTypeSchema);
};

/* -------------------------------------------------------------------------------------------------
 * getLocalizationsFromData
 * -----------------------------------------------------------------------------------------------*/

interface ContentData extends Entity {
  localizations: Localization[];
  // These are our attributes
  [key: string]: Attribute.GetValue<Attribute.Any>;
}

interface Localization extends Pick<ContentData, 'id'> {
  locale: string;
  publishedAt?: string | null;
}

const getLocalizationsFromData = (entity: unknown): Localization[] =>
  typeof entity === 'object' &&
  entity !== null &&
  'localizations' in entity &&
  Array.isArray(entity.localizations)
    ? entity.localizations
    : [];

export { cleanData, getLocalizationsFromData };
export type { Localization };
