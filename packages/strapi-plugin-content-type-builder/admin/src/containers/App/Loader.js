import React from 'react';
import LoadingIndicator from 'components/LoadingIndicator';
import styles from './styles.scss';

const Loader = () => (
  <div className={styles.app}>
    <div className={styles.centered}>
      <LoadingIndicator />
    </div>
  </div>
);

export default Loader;
