/**
 *
 * CommunityContent
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/accessible-emoji */
function CommunityContent() {
  return (
    <React.Fragment>
      <FormattedMessage id="app.components.HomePage.community.content">
        {message => (
          <p className={styles.communityContentP}>
            {message}
          </p>
        )}
      </FormattedMessage>
    </React.Fragment>
  );
}

export default CommunityContent;
