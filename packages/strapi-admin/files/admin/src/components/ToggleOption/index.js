/**
*
* ToggleOption
*
*/

import React from 'react';
import { injectIntl, intlShape } from 'react-intl';

const ToggleOption = ({ value, message, intl }) => (
  <option value={value}>
    {typeof message === 'string' ? message : intl.formatMessage(message).toUpperCase()}
  </option>
);

ToggleOption.propTypes = {
  intl: intlShape.isRequired,
  message: React.PropTypes.oneOfType([
    React.PropTypes.object.isRequired,
    React.PropTypes.string.isRequired,
  ]).isRequired,
  value: React.PropTypes.string.isRequired.isRequired,
};

export default injectIntl(ToggleOption);
