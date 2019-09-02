/*
*
* Official
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function Official(props) {
  return (
    <button className={styles.wrapper} style={props.style}>
      <i className="fa fa-star" />
      <FormattedMessage id="app.components.Official" />
    </button>
  );
}

Official.defaultProps = {
  style: {},
};

Official.propTypes = {
  style: PropTypes.object,
};

export default Official;
