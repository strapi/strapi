/*
*
* DownloadDb
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '../../assets/icons/icon_success.svg';
import styles from './styles.scss';

function DownloadDb() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <img src={Icon} alt="info" />
        <div>
          <FormattedMessage id="settings-manager.components.DownloadDb.download" />
          <br />
          <FormattedMessage id="settings-manager.components.DownloadDb.text" />
        </div>
      </div>
    </div>
  );
}

export default DownloadDb;
