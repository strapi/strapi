/**
*
* TableFooter
*
*/

import React from 'react';
import PropTypes from 'prop-types';

import LimitSelect from '../LimitSelect';
import Pagination from '../Pagination';

import styles from './styles.scss';

class TableFooter extends React.Component {
  render() {
    return (
      <div className={`row ${styles.tableFooter}`}>
        <div className="col-lg-6">
          <LimitSelect
            onChangeLimit={this.props.onChangeLimit}
            limit={this.props.limit}
          />
        </div>

        <div className="col-lg-6">
          <Pagination
            limit={this.props.limit}
            currentPage={this.props.currentPage}
            onChangePage={this.props.onChangePage}
            count={this.props.count}
          />
        </div>
      </div>
    );
  }
}

TableFooter.propTypes = {
  count: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.bool,
  ]).isRequired,
  currentPage: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
  onChangeLimit: PropTypes.func.isRequired,
  onChangePage: PropTypes.func.isRequired,
};

export default TableFooter;
