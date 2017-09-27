/**
*
* AutoReloadBlocker
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

function AutoReloadBlocker() {
  return (
    <div className={styles.autoReloadBlocker}>
      <div className={styles.header}>
        <div>

          <h4>
            <FormattedMessage id="components.AutoReloadBlocker.header" />
          </h4>
          <p>
            <FormattedMessage id="components.AutoReloadBlocker.description" />
          </p>
          <div className={styles.ide}>
            <p>./config/environments/development/server.json</p>
            <div>
              {'{'}
              <ul>
                <li>"host":&nbsp;&nbsp;&nbsp;"localhost"</li>
                <li>"port":&nbsp;&nbsp;&nbsp;1337,</li>
                <li>"autoReload":&nbsp;&nbsp;&nbsp;true,</li>
                <li>"proxi":&nbsp;&nbsp;&nbsp;{'{'}</li>
                <li>&nbsp;&nbsp;&nbsp;"enabled":&nbsp;&nbsp;&nbsp;true</li>
                <li>{'}'},</li>
                <li>"cron":&nbsp;&nbsp;&nbsp;{'{'}</li>
                <li>&nbsp;&nbsp;&nbsp;"enabled":&nbsp;&nbsp;&nbsp;false</li>
                <li>{'}'},</li>
              </ul>
              {'}'}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutoReloadBlocker;
