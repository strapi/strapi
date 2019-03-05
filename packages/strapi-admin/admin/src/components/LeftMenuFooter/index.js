/**
*
* LeftMenuFooter
*
*/

import React from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';
import { PropTypes } from 'prop-types';

import LeftMenuLink from '../LeftMenuLink';

import styles from './styles.scss';
import messages from './messages.json';
defineMessages(messages);

function LeftMenuFooter({ version }) { // eslint-disable-line react/prefer-stateless-function
  return (
    <div className={styles.leftMenuFooter}>
      <ul className={styles.list}>
        <LeftMenuLink
          icon="book"
          label={messages.documentation.id}
          destination="https://strapi.io/documentation"
        />
        <LeftMenuLink
          icon="question-circle"
          label={messages.help.id}
          destination="https://strapi.io/help"
        />
      </ul>
      <div className={styles.poweredBy}>
        <FormattedMessage {...messages.poweredBy} />
        <a href="https://strapi.io" target="_blank">Strapi</a> <a href={`https://github.com/strapi/strapi/releases/tag/v${version}`} target="_blank">v{version}</a>
      </div>
    </div>
  );
}

LeftMenuFooter.propTypes = {
  version: PropTypes.string.isRequired,
};

export default LeftMenuFooter;
