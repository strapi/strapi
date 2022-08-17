import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { getTrad } from '../../utils';
import Title from './Title';

const SectionTitle = ({ isSettings }) => {
  const suffix = isSettings ? 'settings' : 'view';
  const msgId = getTrad(`containers.SettingPage.${suffix}`);

  return (
    <div style={{ marginBottom: '18px' }}>
      <FormattedMessage id={msgId}>{(msg) => <Title>{msg}</Title>}</FormattedMessage>
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
