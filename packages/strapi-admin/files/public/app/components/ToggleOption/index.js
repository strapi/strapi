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
  value: React.PropTypes.string.isRequired,
  message: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.string,
  ]),
  intl: intlShape.isRequired,
};

export default injectIntl(ToggleOption);
