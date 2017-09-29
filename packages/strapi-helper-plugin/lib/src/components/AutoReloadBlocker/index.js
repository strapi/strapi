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
              <pre style={{ whiteSpace: 'pre-wrap'}}>
                <code>
                  &#123;
                  <br />
                  &nbsp;"host": "localhost",
                  <br />
                  &nbsp;"port": 1337,
                  <br />
                  <span style={{ color: '#006EE7'}}>
                    &nbsp;"autoReload": true,
                  </span>
                  <br />
                  &nbsp;"proxi": &#123;
                  <br />
                  &nbsp;&nbsp;"enabled": true
                  <br />
                  &nbsp;&#125;,
                  <br />
                  &nbsp;"cron": &#123;
                  <br />
                  &nbsp;&nbsp;"enabled": false
                  <br />
                  &nbsp;&#125;
                  <br />
                  &#125;
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutoReloadBlocker;
