import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Textarea } from '@strapi/design-system';

const TokenDescription = ({ errors, values, onChange, canEditInputs }) => {
  const { formatMessage } = useIntl();

  return (
    <Textarea
      label={formatMessage({
        id: 'Settings.tokens.form.description',
        defaultMessage: 'Description',
      })}
      id="description"
      error={
        errors.description
          ? formatMessage(
              errors.description?.id
                ? errors.description
                : {
                    id: errors.description,
                    defaultMessage: errors.description,
                  }
            )
          : null
      }
      onChange={onChange}
      disabled={!canEditInputs}
    >
      {values.description}
    </Textarea>
  );
};

TokenDescription.propTypes = {
  errors: PropTypes.shape({
    description: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  canEditInputs: PropTypes.bool.isRequired,
  values: PropTypes.shape({
    description: PropTypes.string,
  }).isRequired,
};

TokenDescription.defaultProps = {
  errors: {},
};

export default TokenDescription;
