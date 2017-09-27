/**
*
* LeftMenuFooter
*
*/

import React from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';

import LocaleToggle from 'containers/LocaleToggle';

import styles from './styles.scss';
import messages from './messages.json';
defineMessages(messages);

class LeftMenuFooter extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.leftMenuFooter}>
        <FormattedMessage {...messages.poweredBy} /> <a href="http://strapi.io" target="_blank">Strapi</a>
        <LocaleToggle />
      </div>
    );
  }
}

export default LeftMenuFooter;
