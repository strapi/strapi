import { Flex } from '@strapi/design-system';

import { getRelationType } from '../../utils/getRelationType';

import { RelationFormBox } from './RelationField/RelationField';
import { RelationNaturePicker } from './RelationNaturePicker/RelationNaturePicker';

import type { FormChangeHandler } from '../../types';
import type { Internal, Schema } from '@strapi/types';

interface RelationProps {
  formErrors: Record<string, { id?: string } | undefined>;
  mainBoxHeader: string;
  modifiedData: {
    name?: string;
    relation?: Schema.Attribute.RelationKind.Any;
    target?: string;
    targetAttribute?: string | null;
  };
  onChange: FormChangeHandler;
  naturePickerType: string;
  targetUid: string;
}

export const Relation = ({
  formErrors,
  mainBoxHeader,
  modifiedData,
  naturePickerType,
  onChange,
  targetUid,
}: RelationProps) => {
  const relationType = getRelationType(modifiedData.relation, modifiedData.targetAttribute);

  return (
    <Flex style={{ position: 'relative' }}>
      <RelationFormBox
        isMain
        header={mainBoxHeader}
        error={formErrors?.name?.id ?? null}
        name="name"
        onChange={onChange}
        value={modifiedData?.name || ''}
      />
      <RelationNaturePicker
        naturePickerType={naturePickerType}
        oneThatIsCreatingARelationWithAnother={mainBoxHeader}
        relationType={relationType!}
        target={modifiedData.target ?? ''}
        targetUid={targetUid}
      />
      <RelationFormBox
        disabled={['oneWay', 'manyWay'].includes(relationType!)}
        error={formErrors?.targetAttribute?.id ?? null}
        name="targetAttribute"
        onChange={onChange}
        oneThatIsCreatingARelationWithAnother={mainBoxHeader}
        target={modifiedData.target as Internal.UID.ContentType | undefined}
        value={modifiedData?.targetAttribute || ''}
      />
    </Flex>
  );
};
