import { TextInput, TextInputProps } from '@strapi/design-system';
import { EyeStriked } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { TranslationMessage } from '../types';

interface NotAllowedInputProps extends Pick<TextInputProps, 'labelAction' | 'name'> {
  description?: TranslationMessage;
  error?: string;
  intlLabel?: TranslationMessage;
}

const NotAllowedInput = ({
  description,
  error,
  intlLabel,
  labelAction,
  name = '',
}: NotAllowedInputProps) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const hint = description?.id
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  const placeholder = formatMessage({
    id: 'components.NotAllowedInput.text',
    defaultMessage: 'No permissions to see this field',
  });

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  return (
    <TextInput
      disabled
      error={errorMessage}
      label={label}
      labelAction={labelAction}
      id={name}
      hint={hint}
      name={name}
      placeholder={placeholder}
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
