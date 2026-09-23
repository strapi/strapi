import { SingleSelectOption, SingleSelect, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { MAX_COMPONENT_DEPTH } from '../constants';
import { getChildrenMaxDepth, getComponentDepth } from '../utils/getMaxDepth';

import { useDataManager } from './DataManager/useDataManager';

import type { FormChangeHandler, IntlLabel } from '../types';
import type { Internal } from '@strapi/types';
interface Option {
  uid: Internal.UID.Component;
  label?: string;
  categoryName?: string;
}

type ComponentToCreate = {
  displayName?: string;
  category?: string;
};

interface SelectComponentProps {
  componentToCreate?: ComponentToCreate | null;
  error?: string | null;
  intlLabel: IntlLabel;
  isAddingAComponentToAnotherComponent: boolean;
  isCreating: boolean;
  isCreatingComponentWhileAddingAField: boolean;
  name: string;
  onChange: FormChangeHandler<string, 'select-category'>;
  targetUid: Internal.UID.Schema;
  value: string;
  forTarget: string;
}

export const SelectComponent = ({
  error = null,
  intlLabel,
  isAddingAComponentToAnotherComponent,
  isCreating,
  isCreatingComponentWhileAddingAField,
  componentToCreate,
  name,
  onChange,
  targetUid,
  forTarget,
  value,
}: SelectComponentProps) => {
  const { formatMessage } = useIntl();
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const label = formatMessage(intlLabel);

  const {
    componentsGroupedByCategory,
    componentsThatHaveOtherComponentInTheirAttributes,
    nestedComponents,
  } = useDataManager();

  const isTargetAComponent = forTarget === 'component';

  let options: Option[] = Object.entries(componentsGroupedByCategory).reduce(
    (acc: Option[], current) => {
      const [categoryName, components] = current;
      const compos = components.map((component) => {
        return {
          uid: component.uid,
          label: component.info.displayName,
          categoryName,
        };
      });

      return [...acc, ...compos];
    },
    []
  );

  if (isAddingAComponentToAnotherComponent) {
    options = options.filter(({ uid }) => {
      const maxDepth = getChildrenMaxDepth(uid, componentsThatHaveOtherComponentInTheirAttributes);
      const componentDepth = getComponentDepth(targetUid, nestedComponents);
      const totalDepth = maxDepth + componentDepth;
      return totalDepth <= MAX_COMPONENT_DEPTH;
    });
  }

  if (isTargetAComponent) {
    options = options.filter((option) => {
      return option.uid !== targetUid;
    });
  }

  if (isCreatingComponentWhileAddingAField) {
    options = [
      {
        uid: value as Internal.UID.Component,
        label: componentToCreate?.displayName,
        categoryName: componentToCreate?.category,
      },
    ];
  }

  return (
    <Field.Root error={errorMessage} name={name}>
      <Field.Label>{label}</Field.Label>
      <SingleSelect
        disabled={isCreatingComponentWhileAddingAField || !isCreating}
        onChange={(value: string | number) => {
          onChange({ target: { name, value: value.toString(), type: 'select-category' } });
        }}
        value={value || ''}
      >
        {options.map((option) => {
          return (
            <SingleSelectOption key={option.uid} value={option.uid}>
              {`${option.categoryName} - ${option.label}`}
            </SingleSelectOption>
          );
        })}
      </SingleSelect>
      <Field.Error />
    </Field.Root>
  );
};
