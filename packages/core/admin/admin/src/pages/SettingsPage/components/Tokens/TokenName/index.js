import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { TextInput } from '@strapi/design-system';

const TokenName = ({ errors, values, onChange, canEditInputs }) => {
  const { formatMessage } = useIntl();

  return (
    <TextInput
      name="name"
      error={
        errors.name
          ? formatMessage(
              errors.name?.id ? errors.name : { id: errors.name, defaultMessage: errors.name }
            )
          : null
      }
      label={formatMessage({
        id: 'Settings.tokens.form.name',
        defaultMessage: 'Name',
      })}
      onChange={onChange}
      value={values.name}
      disabled={!canEditInputs}
      required
    />
  );
};

TokenName.propTypes = {
  errors: PropTypes.shape({
    name: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  canEditInputs: PropTypes.bool.isRequired,
  values: PropTypes.shape({
    name: PropTypes.string,
  }).isRequired,
};

TokenName.defaultProps = {
  errors: {},
};

export default TokenName;
