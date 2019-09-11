import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

const Action = ({ isActive }) => {
  const trad = isActive ? 'default' : 'set';
  const tradId = `${pluginId}.list.languages.${trad}.languages`;
  const color = isActive ? '#49515a' : '#1c5de7';
  const fontStyle = isActive ? 'italic' : '';

  return (
    <FormattedMessage id={tradId}>
      {msg => <span style={{ fontStyle, color }}>{msg}</span>}
    </FormattedMessage>
  );
};

Action.propTypes = {
  isActive: PropTypes.bool.isRequired,
};

export default Action;
