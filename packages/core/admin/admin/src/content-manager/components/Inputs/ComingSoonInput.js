/**
 *
 * CominSoonInput
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { TextInput } from '@strapi/parts/TextInput';
import PropTypes from 'prop-types';

const CominSoonInput = ({ description, intlLabel, labelAction, error, name }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel.id
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
      placeholder="Coming soon"
      type="text"
      value=""
    />
  );
};

CominSoonInput.defaultProps = {
  description: null,
  error: '',
  labelAction: undefined,
};

CominSoonInput.propTypes = {
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

export default CominSoonInput;
