/**
*
* ToggleOption
*
*/

import React from 'react';
import { injectIntl, intlShape } from 'react-intl';

const ToggleOption = ({ value, message, intl, selected }) => (
  <option value={value} selected={selected}>
    {typeof message === 'string' ? message : intl.formatMessage(message).toUpperCase()}
  </option>
);

ToggleOption.propTypes = {
  intl: intlShape.isRequired,
  message: React.PropTypes.oneOfType([
    React.PropTypes.object.isRequired,
    React.PropTypes.string.isRequired,
  ]).isRequired,
  selected: React.PropTypes.bool.isRequired,
  value: React.PropTypes.string.isRequired,
};

export default injectIntl(ToggleOption);
