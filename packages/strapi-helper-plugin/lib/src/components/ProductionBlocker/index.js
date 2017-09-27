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
    <div className={styles.productionBlocker}>
      <div className={styles.header}>
        <div>

          <h4>
            <FormattedMessage id="components.ProductionBlocker.header" />
          </h4>
          <p>
            <FormattedMessage id="components.ProductionBlocker.description" />
          </p>
        </div>
      </div>
    </div>
  );
}

export default AutoReloadBlocker;
