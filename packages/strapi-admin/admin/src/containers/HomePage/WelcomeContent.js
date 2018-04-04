/**
 *
 * WelcomeContent
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/accessible-emoji */
function WelcomeContent() {
  return (
    <React.Fragment>
      <div className={styles.iconWave}>👋</div>
      <FormattedMessage id="app.components.HomePage.welcomeBlock.content">
        {message => (
          <p style={{ marginBottom: '50px' }}>
            {message}
            <span style={{ color: '#005FEA' }}>Slack</span>
            <FormattedMessage id="app.components.HomePage.welcomeBlock.content.raise" />
            <FormattedMessage id="app.components.HomePage.welcomeBlock.content.issues">{message => <span style={{ color: '#005FEA' }}>{message}</span>}</FormattedMessage>
          </p>
        )}
      </FormattedMessage>
    </React.Fragment>
  );
}

export default WelcomeContent;
