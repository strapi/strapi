/**
*
* LeftMenuFooter
*
*/

import React from 'react';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';

class LeftMenuFooter extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.leftMenuFooter}>
        <FormattedMessage {...messages.header} /> <a href="http://strapi.io" target="_blank">Strapi</a>
      </div>
    );
  }
}

export default LeftMenuFooter;
