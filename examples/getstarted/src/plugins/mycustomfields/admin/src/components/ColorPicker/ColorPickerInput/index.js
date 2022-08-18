import React from 'react';
import { Stack } from '@strapi/design-system/Stack';
import { FieldHint, FieldError, FieldLabel } from '@strapi/design-system/Field';
import { useIntl } from 'react-intl';

const ColorPickerInput = ({
  intlLabel,
  id,
  name,
  required,
  labelAction,
  onChange,
  value,
  attribute,
}) => {
  const { formatMessage } = useIntl();

  return (
    <div>
      <Stack spacing={1}>
        <FieldLabel action={labelAction} name={name} required={required} htmlFor={id || name}>
          {formatMessage(intlLabel)}
        </FieldLabel>
        <input type="color" id={id || name} name={name} value={value} onChange={onChange} />
        <FieldHint />
        <FieldError />
      </Stack>
    </div>
  );
};

export default ColorPickerInput;
