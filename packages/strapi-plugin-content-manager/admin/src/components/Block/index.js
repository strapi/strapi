/**
 * 
 * Block
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

const Block = ({ children, description, title }) => (
  <div className="col-md-12">
    <div className={styles.ctmBlock}>
      <div className={styles.ctmBlockTitle}>
        <FormattedMessage id={title} />
        <FormattedMessage id={description}>
          {msg => <p>{msg}</p>}
        </FormattedMessage>
      </div>
      {children}
    </div>
  </div>
);


Block.defaultProps = {
  children: null,
  description: 'app.utils.defaultMessage',
  title: 'app.utils.defaultMessage',
};

Block.propTypes = {
  children: PropTypes.any,
  description: PropTypes.string,
  title: PropTypes.string,
};

export default Block;