import { Flex } from '@strapi/design-system';

import { getRelationType } from '../../utils/getRelationType';

import { RelationFormBox } from './RelationField/RelationField';
import { RelationNaturePicker } from './RelationNaturePicker/RelationNaturePicker';

interface RelationProps {
  formErrors: Record<string, any>;
  mainBoxHeader: string;
  modifiedData: Record<string, any>;
  onChange: (value: any) => void;
  naturePickerType: string;
}

export const Relation = ({
  formErrors,
  mainBoxHeader,
  modifiedData,
  naturePickerType,
  onChange,
}: RelationProps) => {
  const relationType = getRelationType(modifiedData.relation, modifiedData.targetAttribute);

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
