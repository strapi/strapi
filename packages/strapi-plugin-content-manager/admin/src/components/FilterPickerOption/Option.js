import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

const Option = ({ id, value }) => {
  return (
    <FormattedMessage id={id}>
      {msg => <option value={value}>{msg}</option>}
    </FormattedMessage>
  );
};

Option.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

export default Option;
