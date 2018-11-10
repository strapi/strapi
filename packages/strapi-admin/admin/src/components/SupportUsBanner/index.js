/**
 *
 * SupportUsBanner
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import SupportUsTitle from 'components/SupportUsTitle';
import SupportUsCta from 'components/SupportUsCta';

import styles from './styles.scss';

function SupportUsBanner() {
  return (
    <div className={styles.supportUsBanner}>
      <div>
        <div>
          <SupportUsTitle />
          <FormattedMessage id="app.components.HomePage.support.content">
            {message => <p>{message}</p>}
          </FormattedMessage>
        </div>
        <div>
          <SupportUsCta />
        </div>
      </div>
    </div>
  );
}

export default SupportUsBanner;
