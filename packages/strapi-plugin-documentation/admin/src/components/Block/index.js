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
    <div className={styles.documentationBlock} style={style}>
      <div className={styles.documentationBlockTitle}>
        <FormattedMessage id={title} />
        <FormattedMessage id={description}>{renderMsg}</FormattedMessage>
      </div>
      {children}
    </div>
  </div>
);

Block.defaultProps = {
  children: null,
  description: 'app.utils.defaultMessage',
  style: {},
  title: 'app.utils.defaultMessage',
};

Block.propTypes = {
  children: PropTypes.any,
  description: PropTypes.string,
  style: PropTypes.object,
  title: PropTypes.string,
};

export default Block;
