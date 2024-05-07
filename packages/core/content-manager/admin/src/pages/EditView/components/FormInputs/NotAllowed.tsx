import { TextInput } from '@strapi/design-system';
import { EyeStriked } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

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
    <TextInput
      disabled
      // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
      label={label}
      id={name}
      hint={hint}
      name={name}
      placeholder={placeholder}
      required={required}
      startAction={<StyledIcon />}
      type="text"
      value=""
    />
  );
};

const StyledIcon = styled(EyeStriked)`
  & > path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

export { NotAllowedInput };
