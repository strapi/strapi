import { Struct } from '@strapi/strapi';
import { LocalConfig, OrderFieldConfiguration } from '../../../shared/settings';
import { PLUGIN_ID } from '../../../shared/constants';
import { Attribute } from '@strapi/types/dist/schema';
import { useEffect, useState } from 'react';
import { set } from 'lodash';

export interface UseAttributeNamesParams {
  contentTypeUid: string | undefined,
  groupField?: string | undefined,
  localConfig: LocalConfig,
  collectionTypes: Struct.ContentTypeSchema[] | undefined
}

/**
 * Hook to get attribute data
 * @param props - The parameters to get the attribute data, including the content type UID, group field, local configuration and collection types
 * @returns The attribute data
 */
export const useAttributeData = (props: UseAttributeNamesParams) => {
  const { contentTypeUid, groupField, localConfig, collectionTypes } = props;

  const [chosenMediaField, setChosenMediaField] = useState<string | undefined>(undefined);
  const [chosenTitleField, setChosenTitleField] = useState<string | undefined>(undefined);
  const [chosenSubtitleField, setChosenSubtitleField] = useState<string | undefined>(undefined);
  const [mediaAttributeNames, setMediaAttributeNames] = useState<string[]>([]);
  const [titleAttributeNames, setTitleAttributeNames] = useState<string[]>([]);
  const [currentAttribute, setCurrentAttribute] = useState<(Attribute.AnyAttribute & { order: '1d' | '2d' | 'multiline' }) | null>(null);
  const [currentCollectionType, setCurrentCollectionType] = useState<Struct.ContentTypeSchema | undefined>(undefined);
  const [currentFieldSettings, setCurrentFieldSettings] = useState<OrderFieldConfiguration | undefined>(undefined);

  useEffect(() => {
    setChosenMediaField(localConfig?.chosenMediaField);
    setChosenTitleField(localConfig?.chosenTitleField);
    setChosenSubtitleField(localConfig?.chosenSubtitleField);
  }, [localConfig]);

  useEffect(() => {
    const collectionType = collectionTypes?.find((collectionType) => collectionType.uid === contentTypeUid);
    setCurrentCollectionType(collectionType);

    if (collectionType) {
      const mediaNames = Object.keys(collectionType.attributes || {}).filter((attributeName) => {
        const attribute = collectionType.attributes[attributeName];
        return attribute?.type === 'media';
      });
      setMediaAttributeNames(mediaNames);

      const titleNames = Object.keys(collectionType.attributes || {}).filter((attributeName) => {
        const attribute = collectionType.attributes[attributeName];
        return attribute?.type === 'string';
      });
      setTitleAttributeNames(titleNames);

      const currentAttr = Object.keys(collectionType.attributes || {}).map((attributeName) => {
        const attribute = collectionType.attributes[attributeName];
        if (!attribute || !groupField || attributeName !== groupField) {
          return null;
        }
        const isOrder = (attribute as any)?.customField === `plugin::${PLUGIN_ID}.order`;
        const isOrder2d = (attribute as any)?.customField === `plugin::${PLUGIN_ID}.order2d`;
        const isMultiline = (attribute as any)?.customField === `plugin::${PLUGIN_ID}.orderMultiline`;
        return {
          ...attribute,
          order: (isOrder ? '1d' : isOrder2d ? '2d' : isMultiline ? 'multiline' : undefined) as '1d' | '2d' | 'multiline'
        };
      }).filter((x) => x)[0];

      setCurrentAttribute(currentAttr);
      setCurrentFieldSettings((currentAttr as any)?.options.group as OrderFieldConfiguration);
    }
  }, [contentTypeUid, groupField, collectionTypes]);

  return {
    mediaAttributeNames,
    titleAttributeNames,
    chosenSubtitleField,
    chosenMediaField,
    chosenTitleField,
    currentAttribute,
    currentCollectionType,
    currentFieldSettings
  };
};

export default useAttributeData;
