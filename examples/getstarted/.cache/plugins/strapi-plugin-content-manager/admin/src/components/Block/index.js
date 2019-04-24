/**
 * 
 * Block
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

const renderMsg = msg => <p>{msg}</p>;

const Block = ({ children, description, style, title }) => (
  <div className="col-md-12">
    <div className={styles.ctmBlock} style={style}>
      <div className={styles.ctmBlockTitle}>
        {!!title && <FormattedMessage id={title} />}
        {!!description && (
          <FormattedMessage id={description}>
            {renderMsg}
          </FormattedMessage>
        )}
      </div>
      {children}
    </div>
  </div>
);


Block.defaultProps = {
  children: null,
  description: null,
  style: {},
  title: null,
};

Block.propTypes = {
  children: PropTypes.any,
  description: PropTypes.string,
  style: PropTypes.object,
  title: PropTypes.string,
};

export default Block;
