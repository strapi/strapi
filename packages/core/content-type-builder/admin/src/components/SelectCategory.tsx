import { useState } from 'react';

import { ComboboxOption, Combobox, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useDataManager } from '../hooks/useDataManager';

interface SelectCategoryProps {
  error?: string | null;
  intlLabel: {
    id: string;
    defaultMessage: string;
    values?: Record<string, any>;
  };
  name: string;
  onChange: (value: { target: { name: string; value: any; type: string } }) => void;
  value?: string;
  isCreating?: boolean;
}

export const SelectCategory = ({
  error = null,
  intlLabel,
  name,
  onChange,
  value = undefined,
  isCreating,
}: SelectCategoryProps) => {
  const { formatMessage } = useIntl();
  const { allComponentsCategories } = useDataManager();
  const [categories, setCategories] = useState(allComponentsCategories);

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const label = formatMessage(intlLabel);

  const handleChange = (value: any) => {
    onChange({ target: { name, value, type: 'select-category' } });
  };

  const handleCreateOption = (value: any) => {
    setCategories((prev) => [...prev, value]);
    handleChange(value);
  };

  return (
    <Field.Root error={errorMessage} name={name}>
      <Field.Label>{label}</Field.Label>
      <Combobox
        // TODO: re-enable category edits, renaming categories of already existing components currently breaks other functionality
        // See https://github.com/strapi/strapi/issues/20356
        disabled={!isCreating}
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
