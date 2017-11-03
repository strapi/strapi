/**
*
* ContentHeader
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
function ContentHeader({ name, description }) { // eslint-disable-line react/prefer-stateless-function
  const title = name ? <FormattedMessage id={`settings-manager.${name}`} /> : <span />;
  const subTitle = description ? <FormattedMessage id={`settings-manager.${description}`} /> : <span />;
  return (
    <div className={styles.contentHeader}>
      <div className={styles.title}>
        {title}
      </div>
      <div className={styles.subTitle}>
        {subTitle}
      </div>
    </div>
  );
}

ContentHeader.propTypes = {
  description: PropTypes.string,
  name: PropTypes.string,
};

export default ContentHeader;
