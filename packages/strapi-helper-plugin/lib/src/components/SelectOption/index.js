/**
 *
 * SelectOption
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import PropTypes from 'prop-types';

function SelectOption({ id, name, params, value }) {
  const messageId = generateMessageId(id, name, value);

  return (
    <FormattedMessage id={messageId} defaultMessage={messageId} values={params}>
      {(message) => <option value={value}>{message}</option>}
    </FormattedMessage>
  );
}

function generateMessageId(id, name, value) {
  if (!isEmpty(id)) {
    return id;
  }

  if (!isEmpty(name)) {
    return name;
  }

  // NOTE: Some plugins uses name to set i18n
  return value;
}

SelectOption.defaultProps = {
  id: '',
  name: '',
  params: {},
  value: 'app.utils.SelectOption.defaultMessage',
};

SelectOption.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  params: PropTypes.object,
  value: PropTypes.string,
};

export default SelectOption;
