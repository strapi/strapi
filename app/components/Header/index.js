/**
*
* Header
*
*/

import React from 'react';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.css';

class Header extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.header}>
        <FormattedMessage {...messages.header} />
      </div>
    );
  }
}

export default Header;
