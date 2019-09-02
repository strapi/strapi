/**
*
* LeftMenuSectionTitle
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

function LeftMenuSectionTitle({ id }) {
  return (
    <p className={styles.leftMenuSectionTitle}>
      <FormattedMessage id={id} />
    </p>
  );
}

LeftMenuSectionTitle.defaultProps = {
  id: 'app.utils.defaultMessage',
};

LeftMenuSectionTitle.propTypes = {
  id: PropTypes.string,
};

export default LeftMenuSectionTitle;
