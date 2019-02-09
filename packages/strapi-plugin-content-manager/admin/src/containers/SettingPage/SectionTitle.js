import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

const SectionTitle = ({ isSettings }) => {
  const suffix = isSettings ? 'settings' : 'layout';
  const msgId = `content-manager.containers.SettingPage.${suffix}`;

  return (
    <div style={{ marginBottom: '18px' }}>
      <FormattedMessage id={msgId}>
        {msg => <span className={styles.sectionTitle}>{msg}</span>}
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

export default SectionTitle;
