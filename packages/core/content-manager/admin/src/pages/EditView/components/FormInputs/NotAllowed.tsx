import { Field, TextInput } from '@strapi/design-system';
import { EyeStriked } from '@strapi/icons';
import { useIntl } from 'react-intl';

import type { InputProps } from '@strapi/admin/strapi-admin';
import type { Schema } from '@strapi/types';

interface NotAllowedInputProps extends Omit<InputProps, 'type'> {
  type: Schema.Attribute.Kind;
}

const NotAllowedInput = ({ hint, label, required, name }: NotAllowedInputProps) => {
  const { formatMessage } = useIntl();

  const placeholder = formatMessage({
    id: 'components.NotAllowedInput.text',
    defaultMessage: 'No permissions to see this field',
  });

  return (
    <Field.Root id={name} hint={hint} name={name} required={required}>
      <Field.Label>{label}</Field.Label>
      <TextInput
        disabled
        placeholder={placeholder}
        startAction={<EyeStriked fill="neutral600" />}
        type="text"
        value=""
      />
      <Field.Hint />
    </Field.Root>
  );
};

export { NotAllowedInput };
