import { Box, Checkbox, Field, Flex, NumberInput, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { FormChangeHandler, IntlLabel } from '../types';

interface CheckboxWithNumberFieldProps {
  error?: string;
  intlLabel: IntlLabel;
  modifiedData: { type?: string };
  name: string;
  onChange: FormChangeHandler<string | number | null>;
  value?: string | number | null;
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
        onCheckedChange={(value) => {
          const initValue = type === 'text' ? '0' : 0;
          const nextValue = value ? initValue : null;

          onChange({ target: { name, value: nextValue } });
        }}
        checked={value !== null}
      >
        {label}
      </Checkbox>
      {value !== null && (
        <Box paddingLeft={6} style={{ maxWidth: '200px' }}>
          {type === 'text' ? (
            <Field.Root error={errorMessage} name={name}>
              <TextInput
                aria-label={label}
                disabled={disabled}
                onChange={onChange}
                value={value === null ? '' : value}
                type="text"
              />
              <Field.Error />
            </Field.Root>
          ) : (
            <Field.Root error={errorMessage} name={name}>
              <NumberInput
                aria-label={label}
                disabled={disabled}
                onValueChange={(value: string | number | undefined) => {
                  onChange({ target: { name, value: value ?? 0, type } });
                }}
                value={value || 0}
              />
              <Field.Error />
            </Field.Root>
          )}
        </Box>
      )}
    </Flex>
  );
};
