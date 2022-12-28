import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Field } from '@strapi/design-system/Field';

const FieldWrapper = ({ name, hint, error, children, required }) => {
  const { formatMessage } = useIntl();
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  return (
    <Field
      name={name}
      hint={hint && formatMessage(hint)}
      error={errorMessage}
      id={name}
      required={required}
    >
      {children}
    </Field>
  );
};

FieldWrapper.defaultProps = {
  hint: undefined,
  error: '',
  required: false,
};

FieldWrapper.propTypes = {
  name: PropTypes.string.isRequired,
  hint: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
  required: PropTypes.bool,
};

export default FieldWrapper;
