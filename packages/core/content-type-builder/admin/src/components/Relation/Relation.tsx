import { Flex } from '@strapi/design-system';

import { getRelationType } from '../../utils/getRelationType';
import { useDataManager } from '../DataManager/useDataManager';

import { RelationFormBox } from './RelationField/RelationField';
import { RelationNaturePicker } from './RelationNaturePicker/RelationNaturePicker';

import type { UID } from '@strapi/types';

interface RelationProps {
  formErrors: Record<string, any>;
  mainBoxHeader: string;
  modifiedData: Record<string, any>;
  onChange: (value: any) => void;
  naturePickerType: string;
  targetUid: UID.Component | UID.ContentType;
}

export const Relation = ({
  formErrors,
  // mainBoxHeader,
  modifiedData,
  naturePickerType,
  onChange,
  targetUid,
}: RelationProps) => {
  const relationType = getRelationType(modifiedData.relation, modifiedData.targetAttribute);

  const { contentTypes, components } = useDataManager();

  const type =
    targetUid in contentTypes
      ? contentTypes[targetUid as UID.ContentType]
      : components[targetUid as UID.Component];

  if (!type) {
    return null;
  }

  const mainBoxHeader = type?.info?.displayName ?? '';

  console.log({
    formErrors,
    mainBoxHeader,
    modifiedData,
    naturePickerType,
    onChange,
    targetUid,
  });

  return (
    <Flex style={{ position: 'relative' }}>
      <RelationFormBox
        isMain
        header={mainBoxHeader}
        error={formErrors?.name || null}
        name="name"
        onChange={onChange}
        value={modifiedData?.name || ''}
      />
      <RelationNaturePicker
        naturePickerType={naturePickerType}
        oneThatIsCreatingARelationWithAnother={mainBoxHeader}
        relationType={relationType!}
        target={modifiedData.target}
        targetUid={targetUid}
      />
      <RelationFormBox
        disabled={['oneWay', 'manyWay'].includes(relationType!)}
        error={formErrors?.targetAttribute || null}
        name="targetAttribute"
        onChange={onChange}
        oneThatIsCreatingARelationWithAnother={mainBoxHeader}
        target={modifiedData.target}
        value={modifiedData?.targetAttribute || ''}
      />
    </Flex>
  );
};
