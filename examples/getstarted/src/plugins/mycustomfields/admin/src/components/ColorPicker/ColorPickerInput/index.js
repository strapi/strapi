import React from 'react';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
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
    <Field
      name={name}
      id={name}
      error={error && formatMessage(error)}
      hint={description && formatMessage(description)}
    >
      <Stack spacing={1}>
        <FieldLabel required={required}>{formatMessage(intlLabel)}</FieldLabel>
        <Typography variant="pi" as="p">
          Format: {attribute.options.format}
        </Typography>
        <input type="color" id={name} name={name} value={value || ''} onChange={onChange} />
        <FieldHint />
        <FieldError />
      </Stack>
    </Field>
  );
};

export default ColorPickerInput;
