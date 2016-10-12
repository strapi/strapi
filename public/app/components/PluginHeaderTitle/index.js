/**
*
* PluginHeaderTitle
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import messages from './messages.json';
import { define } from '../../i18n';
define(messages);

import styles from './styles.scss';

class PluginHeaderTitle extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.pluginHeaderTitle}>
        <h1 className={styles.pluginHeaderTitleName}>
          <FormattedMessage {...messages.title} />
        </h1>
        <p className={styles.pluginHeaderTitleDescription}>
          <FormattedMessage {...messages.description} />
        </p>
      </div>
    );
  }
}

export default PluginHeaderTitle;
