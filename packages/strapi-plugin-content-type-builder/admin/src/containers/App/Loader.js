import React from 'react';
import { LoadingIndicator } from 'strapi-helper-plugin';
import styles from './styles.scss';

const Loader = () => (
  <div className={styles.app}>
    <div className={styles.centered}>
      <LoadingIndicator />
    </div>
  </div>
);

export default Loader;
