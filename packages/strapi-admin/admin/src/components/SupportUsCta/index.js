/**
 *
 * SupportUsCta
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

function SupportUsCta() {
  return (
    <FormattedMessage id="app.components.HomePage.support.link">
      {message => (
        <a href="https://strapi.io/shop" target="_blank" className={styles.supportUsCta}>
          {message}
        </a>
      )}
    </FormattedMessage>
  );
}

export default SupportUsCta;
