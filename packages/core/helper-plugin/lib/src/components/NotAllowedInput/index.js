/**
 *
 * NotAllowedInput
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { TextInput } from '@strapi/design-system/TextInput';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import EyeStriked from '@strapi/icons/EyeStriked';

const StyledIcon = styled(EyeStriked)`
  > path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const NotAllowedInput = ({ description, intlLabel, labelAction, error, name }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const hint = description
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
      onChange={() => {}}
      placeholder={placeholder}
      startAction={<StyledIcon />}
      type="text"
      value=""
    />
  );
};

NotAllowedInput.defaultProps = {
  description: null,
  error: '',
  labelAction: undefined,
};

NotAllowedInput.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
};

export default NotAllowedInput;
