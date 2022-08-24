import React from 'react';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Field, FieldHint, FieldError, FieldLabel } from '@strapi/design-system/Field';
import { TextInput } from '@strapi/design-system/TextInput';
import { useIntl } from 'react-intl';
import getTrad from '../../../utils/getTrad';

const ColorPickerInput = ({
  attribute,
  description,
  disabled,
  error,
  intlLabel,
  labelAction,
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
      // GenericInput calls formatMessage and returns a string for the error
      error={error}
      hint={description && formatMessage(description)}
    >
      <Stack spacing={1}>
        <Flex>
          <FieldLabel required={required}>{formatMessage(intlLabel)}</FieldLabel>
          {labelAction && <Box paddingLeft={1}>{labelAction}</Box>}
        </Flex>
        <Typography variant="pi" as="p">
          {formatMessage(
            {
              id: getTrad('input.format'),
              defaultMessage: 'Using color format {format}',
            },
            {
              format: attribute.options.format,
            }
          )}
        </Typography>
        <input
          type="color"
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          disabled={disabled}
        />
        <FieldHint />
        <FieldError />
      </Stack>
    </Field>
  );
};

export default ColorPickerInput;
