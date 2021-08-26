/**
 *
 * Input
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { Checkbox } from '@strapi/parts/Checkbox';
import { TextInput } from '@strapi/parts/TextInput';
import PropTypes from 'prop-types';

const Input = ({
  description,
  disabled,
  intlLabel,
  name,
  placeholder,
  providerToEditName,
  type,
}) => {
  const { formatMessage } = useIntl();
  const value =
    name === 'noName' ? `${strapi.backendURL}/connect/${providerToEditName}/callback` : '';

  const label = formatMessage(
    { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
    { ...intlLabel.values }
  );
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  if (type === 'bool') {
    return (
      <Checkbox disabled={disabled} hint={hint}>
        {label}
      </Checkbox>
    );
  }

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  return (
    <TextInput
      disabled={disabled}
      label={label}
      onChange={() => {}}
      placeholder={formattedPlaceholder}
      type={type}
      value={value}
    />
  );
};

Input.defaultProps = {
  description: null,
  disabled: false,
  placeholder: null,
};

Input.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  providerToEditName: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

export default Input;
