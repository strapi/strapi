/**
 *
 * RequiredCheckbox
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Checkbox } from '@strapi/design-system/Checkbox';

const RequiredCheckbox = ({
  description,
  error,
  intlLabel,
  modifiedData,
  name,
  onChange,
  value,
}) => {
  const { formatMessage } = useIntl();
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const disabled = modifiedData.adminOptions?.hidden;
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : undefined;
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  return (
    <Checkbox
      disabled={disabled}
      error={errorMessage}
      hint={hint}
      id={name}
      name={name}
      onValueChange={value => {
        onChange({ target: { name, value } });
      }}
      value={Boolean(value)}
    >
      {label}
    </Checkbox>
  );
};

RequiredCheckbox.defaultProps = {
  description: undefined,
  error: null,
  value: null,
};

RequiredCheckbox.propTypes = {
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
  modifiedData: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

export default RequiredCheckbox;
