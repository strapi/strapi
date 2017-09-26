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
            handleChange={this.props.handleChangeLimit}
            limit={this.props.limit}
          />
        </div>

        <div className="col-lg-6">
          <Pagination
            limit={this.props.limit}
            currentPage={this.props.currentPage}
            changePage={this.props.changePage}
            count={this.props.count}
          />
        </div>
      </div>
    );
  }
}

TableFooter.propTypes = {
  changePage: PropTypes.func.isRequired,
  count: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.bool,
  ]).isRequired,
  currentPage: PropTypes.number.isRequired,
  handleChangeLimit: PropTypes.func.isRequired,
  limit: PropTypes.number.isRequired,
};

export default TableFooter;
