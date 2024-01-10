import { useState } from 'react';

import { Box, Checkbox, Flex, NumberInput, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { IntlLabel } from '../types';

interface CheckboxWithNumberFieldProps {
  error?: string;
  intlLabel: IntlLabel;
  modifiedData: Record<string, any>;
  name: string;
  onChange: (value: any) => void;
  value?: any;
}

export const CheckboxWithNumberField = ({
  error,
  intlLabel,
  modifiedData,
  name,
  onChange,
  value = null,
}: CheckboxWithNumberFieldProps) => {
  const { formatMessage } = useIntl();
  const [showInput, setShowInput] = useState(!!value || value === 0);
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const type = modifiedData.type === 'biginteger' ? 'text' : 'number';

  const disabled = !modifiedData.type;
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Checkbox
        id={name}
        name={name}
        onValueChange={(value: any) => {
          const initValue = type === 'text' ? '0' : 0;
          const nextValue = value ? initValue : null;

          onChange({ target: { name, value: nextValue } });
          setShowInput((prev) => !prev);
        }}
        value={showInput}
      >
        {label}
      </Checkbox>
      {showInput && (
        <Box paddingLeft={6} style={{ maxWidth: '200px' }}>
          {type === 'text' ? (
            <TextInput
              label=""
              aria-label={label}
              disabled={disabled}
              error={errorMessage}
              id={name}
              name={name}
              onChange={onChange}
              value={value === null ? '' : value}
            />
          ) : (
            <NumberInput
              aria-label={label}
              disabled={disabled}
              error={errorMessage}
              id={name}
              name={name}
              onValueChange={(value: any) => {
                onChange({ target: { name, value, type } });
              }}
              value={value || 0}
            />
          )}
        </Box>
      )}
    </Flex>
  );
};
