/**
 *
 * WelcomeContent
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/accessible-emoji */
function WelcomeContent({ hasContent }) {
  return (
    <React.Fragment>
      <div className={styles.iconWave}>👋</div>
      {!hasContent && (
        <FormattedMessage id="app.components.HomePage.welcomeBlock.content">
          {message => (
            <p className={styles.welcomeContentP}>
              {message}
              <a className={styles.welcomeContentA} href="https://slack.strapi.io/" target="_blank">
                Slack
              </a>
              <FormattedMessage id="app.components.HomePage.welcomeBlock.content.raise" />
              <FormattedMessage id="app.components.HomePage.welcomeBlock.content.issues">
                {message => (
                  <a
                    className={styles.welcomeContentA}
                    href="https://github.com/strapi/strapi/issues/new/choose"
                    target="_blank"
                  >
                    {message}
                  </a>
                )}
              </FormattedMessage>
            </p>
          )}
        </FormattedMessage>
      )}
      {hasContent && (
        <FormattedMessage id="app.components.HomePage.welcomeBlock.content.again">
          {message => (
            <p className={styles.welcomeContentP}>{message}</p>
          )}
        </FormattedMessage>
      )}
    </React.Fragment>
  );
}

WelcomeContent.defaultProps = {
  hasContent: false,
};

WelcomeContent.propTypes = {
  hasContent: PropTypes.bool,
};

export default WelcomeContent;
