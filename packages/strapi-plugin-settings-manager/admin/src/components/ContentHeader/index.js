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
  return (
    <div className={styles.contentHeader}>
      <div className={styles.title}>
        <FormattedMessage id={`settings-manager.${name }`} />
      </div>
      <div className={styles.subTitle}><FormattedMessage id={`settings-manager.${description}`} /></div>
    </div>
  );
}

ContentHeader.propTypes = {
  description: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default ContentHeader;
