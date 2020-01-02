import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../pluginId';
import Title from './Title';

const SectionTitle = ({ isSettings }) => {
  const suffix = isSettings ? 'settings' : 'view';
  const msgId = `${pluginId}.containers.SettingPage.${suffix}`;

  return (
    <div style={{ marginBottom: '18px' }}>
      <FormattedMessage id={msgId}>
        {msg => <Title>{msg}</Title>}
      </FormattedMessage>
    </div>
  );
};

SectionTitle.propTypes = {
  isSettings: PropTypes.bool,
};

SectionTitle.defaultProps = {
  isSettings: false,
};

export default memo(SectionTitle);
