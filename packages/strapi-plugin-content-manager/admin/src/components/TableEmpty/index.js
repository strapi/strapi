/**
 *
 * TableRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

class TableEmpty extends React.Component {
  render() {
    return (
      <tr className={styles.tableEmpty}>
        <td colSpan={this.props.colspan + 1}>There is no {this.props.contentType || 'entry'}...</td>
      </tr>
    );
  }
}


TableEmpty.propTypes = {
  colspan: PropTypes.number.isRequired,
  contentType: PropTypes.string.isRequired,
};

export default TableEmpty;
