/**
 *
 * NotSupported
 *
 */

import React from 'react';
import { TextInput } from '@strapi/design-system/TextInput';
import PropTypes from 'prop-types';

const NotSupported = ({ hint, label, labelAction, error, name, required }) => {
  return (
    <TextInput
      disabled
      error={error}
      label={label}
      labelAction={labelAction}
      id={name}
      hint={hint}
      name={name}
      onChange={() => {}}
      placeholder="Not supported"
      required={required}
      type="text"
      value=""
    />
  );
};

NotSupported.defaultProps = {
  hint: null,
  error: undefined,
  labelAction: undefined,
  required: false,
};

NotSupported.propTypes = {
  error: PropTypes.string,
  hint: PropTypes.string,
  label: PropTypes.string.isRequired,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  required: PropTypes.bool,
};

export default NotSupported;
