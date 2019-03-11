/**
*
* HeaderModalTitle
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

function HeaderModalTitle({ title }) {
  return (
    <div className={styles.headerModalTitle}>
      <FormattedMessage id={title} />
    </div>
  );
}

HeaderModalTitle.propTypes = {
  title: PropTypes.string.isRequired,
};

export default HeaderModalTitle;
