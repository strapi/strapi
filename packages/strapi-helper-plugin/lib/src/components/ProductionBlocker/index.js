/**
*
* ProductionBlocker
*
*/

import React from 'react';
import cn from 'classnames';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

function ProductionBlocker() {
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
          <div className={styles.buttonContainer}>
            <a className={cn(styles.primary, 'btn')} href="http://strapi.io" target="_blank">Read the documentation</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductionBlocker;
