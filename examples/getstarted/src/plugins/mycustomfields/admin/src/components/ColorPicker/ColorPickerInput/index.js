import React from 'react';
import { Stack } from '@strapi/design-system/Stack';
import { Field, FieldHint, FieldError, FieldLabel } from '@strapi/design-system/Field';
import { useIntl } from 'react-intl';

const ColorPickerInput = ({
  attribute,
  description,
  error,
  hint,
  id,
  intlLabel,
  name,
  onChange,
  required,
  value,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Stack spacing={1}>
      <Field
        name={name}
        id={name}
        error={error && formatMessage(error)}
        hint={description && formatMessage(description)}
      >
        <FieldLabel required={required}>{formatMessage(intlLabel)}</FieldLabel>
        <input type="color" id={name} name={name} value={value || ''} onChange={onChange} />
        <FieldHint />
        <FieldError />
      </Field>
    </Stack>
  );
};

export default ColorPickerInput;
