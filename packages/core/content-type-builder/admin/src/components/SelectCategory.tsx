import { useState } from 'react';

import { ComboboxOption, Combobox, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useDataManager } from './DataManager/useDataManager';

import type { FormChangeHandler, IntlLabel } from '../types';

interface SelectCategoryProps {
  error?: string | null;
  intlLabel: IntlLabel;
  name: string;
  onChange: FormChangeHandler<string, 'select-category'>;
  value?: string;
  isCreating?: boolean;
  dynamicZoneTarget?: string | null;
}

export const SelectCategory = ({
  error = null,
  intlLabel,
  name,
  onChange,
  value = undefined,
  isCreating,
  dynamicZoneTarget,
}: SelectCategoryProps) => {
  const { formatMessage } = useIntl();
  const { allComponentsCategories } = useDataManager();
  const [categories, setCategories] = useState(allComponentsCategories);

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const label = formatMessage(intlLabel);

  const handleChange = (value?: string) => {
    if (value === undefined) {
      return;
    }

    onChange({ target: { name, value, type: 'select-category' } });
  };

  const handleCreateOption = (value?: string) => {
    if (value === undefined) {
      return;
    }

    setCategories((prev) => [...prev, value]);
    handleChange(value);
  };

  return (
    <Field.Root error={errorMessage} name={name}>
      <Field.Label>{label}</Field.Label>
      <Combobox
        // TODO: re-enable category edits, renaming categories of already existing components currently breaks other functionality
        // See https://github.com/strapi/strapi/issues/20356
        disabled={!isCreating && !dynamicZoneTarget}
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        value={value}
        creatable
      >
        {categories.map((category) => (
          <ComboboxOption key={category} value={category}>
            {category}
          </ComboboxOption>
        ))}
      </Combobox>
      <Field.Error />
    </Field.Root>
  );
};
