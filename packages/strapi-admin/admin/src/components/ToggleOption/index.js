/**
*
* ToggleOption
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl, intlShape } from 'react-intl';

const ToggleOption = ({ value, message, intl }) => (
  <option value={value}>
    {typeof message === 'string' ? message : intl.formatMessage(message).toUpperCase()}
  </option>
);

ToggleOption.propTypes = {
  intl: intlShape.isRequired,
  message: PropTypes.oneOfType([
    PropTypes.object.isRequired,
    PropTypes.string.isRequired,
  ]).isRequired,
  value: PropTypes.string.isRequired,
};

export default injectIntl(ToggleOption);
