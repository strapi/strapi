/**
*
* LeftMenuFooter
*
*/

import React from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';
import { PropTypes } from 'prop-types';
import { take } from 'lodash';

import LocaleToggle from 'containers/LocaleToggle';

import styles from './styles.scss';
import messages from './messages.json';
defineMessages(messages);

function LeftMenuFooter({ version }) { // eslint-disable-line react/prefer-stateless-function
  const strapiV = take(`${version.split('.')[0]}${version.split('alpha')[1]}`, 4).join('');

  return (
    <div className={styles.leftMenuFooter}>
      <FormattedMessage {...messages.poweredBy} />
      <a href="http://strapi.io" target="_blank"> Strapi</a>
      <span>&nbsp;(v{strapiV})</span>
      <LocaleToggle />
    </div>
  );
}

LeftMenuFooter.propTypes = {
  version: PropTypes.string.isRequired,
};

export default LeftMenuFooter;
