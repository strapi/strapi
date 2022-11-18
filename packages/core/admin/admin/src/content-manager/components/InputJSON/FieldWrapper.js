import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Field } from '@strapi/design-system/Field';

const FieldWrapper = ({ name, hint, error, children }) => {
  const { formatMessage } = useIntl();
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  return (
    <Field name={name} hint={hint && formatMessage(hint)} error={errorMessage} id={name}>
      {children}
    </Field>
  );
};

FieldWrapper.defaultProps = {
  hint: undefined,
  error: '',
};

FieldWrapper.propTypes = {
  name: PropTypes.string.isRequired,
  hint: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default FieldWrapper;
