/*
*
* DownloadInfo
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '../../assets/icons/icon_success.svg';
import styles from './styles.scss';

function DownloadInfo() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <img src={Icon} alt="info" />
        <div>
          <FormattedMessage id="app.components.DownloadInfo.download" />
          <br />
          <FormattedMessage id="app.components.DownloadInfo.text" />
        </div>
      </div>
    </div>
  );
}

export default DownloadInfo;
