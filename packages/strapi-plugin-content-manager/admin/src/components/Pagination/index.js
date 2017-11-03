/**
 *
 * Pagination
 *
 */

import React from 'react';
import { map } from 'lodash';
import PropTypes from 'prop-types';

import styles from './styles.scss';

class Pagination extends React.Component {
  getLastPageNumber = () => {
    return Math.ceil(this.props.count / this.props.limit);
  }

  handleDotsClick = (e) => {
    e.preventDefault();
  }

  handlePreviousPageClick = (e) => {
    e.preventDefault();

    if (!this.isFirstPage()) {
      this.props.onChangePage(this.props.currentPage - 1);
    }
  }

  handleNextPageClick = (e) => {
    e.preventDefault();

    if (!this.isLastPage()) {
      this.props.onChangePage(this.props.currentPage + 1);
    }
  }

  handleFirstPageClick = (e) => {
    e.preventDefault();

    this.props.onChangePage(1);
  }

  handleLastPageClick = (e) => {
    e.preventDefault();

    this.props.onChangePage(this.getLastPageNumber());
  }

  isFirstPage = () => {
    return this.props.currentPage === 1;
  }

  isLastPage = () => {
    return this.props.currentPage === this.getLastPageNumber();
  }

  needAfterLinksDots = () => {
    return this.props.currentPage < this.getLastPageNumber() - 1;
  }

  needPreviousLinksDots = () => {
    return this.props.currentPage > 3;
  }

  renderLinks = () => {
    // Init variables
    const linksOptions = [];

    // Add active page link
    linksOptions.push({
      value: this.props.currentPage,
      isActive: true,
      handleClick: e => {
        e.preventDefault();
      },
    });

    // Add previous page link
    if (!this.isFirstPage()) {
      linksOptions.unshift({
        value: this.props.currentPage - 1,
        isActive: false,
        handleClick: this.handlePreviousPageClick,
      });
    }

    // Add next page link
    if (!this.isLastPage() && this.props.count > this.props.limit) {
      linksOptions.push({
        value: this.props.currentPage + 1,
        isActive: false,
        handleClick: this.handleNextPageClick,
      });
    }

    if (this.needPreviousLinksDots()) {
      linksOptions.unshift({
        value: 1,
        isActive: false,
        handleClick: this.handleFirstPageClick,
      });
    }

    if (this.needAfterLinksDots()) {
      linksOptions.push({
        value: this.getLastPageNumber(),
        isActive: false,
        handleClick: this.handleLastPageClick,
      });
    }

    // Generate links
    return (
      map(linksOptions, (linksOption, key) => (
        <li
          className={`${linksOption.isActive && styles.navLiActive}`}
          key={key}
        >
          <a href="" disabled={linksOption.isActive} onClick={linksOption.handleClick}>
            {linksOption.value}
          </a>
        </li>
      ))
    );
  }

  render() {
    return (
      <div className={styles.pagination}>
        <div>
          <a
            href=""
            className={`
               ${styles.paginationNavigator}
               ${this.isFirstPage() && styles.paginationNavigatorDisabled}
             `}
            onClick={this.handlePreviousPageClick}
            disabled={this.isFirstPage()}
          >
            <i className="fa fa-angle-left" aria-hidden="true"></i>
          </a>
          <nav className={styles.nav}>
            <ul className={styles.navUl}>
              {this.renderLinks()}
            </ul>
          </nav>
          <a
            href=""
            className={`
               ${styles.paginationNavigator}
               ${this.isLastPage() && styles.paginationNavigatorDisabled}
             `}
            onClick={this.handleNextPageClick}
            disabled={this.isLastPage()}
          >
            <i className="fa fa-angle-right" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    );
  }
}

Pagination.propTypes = {
  count: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.bool,
  ]).isRequired,
  currentPage: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
  onChangePage: PropTypes.func.isRequired,
};

export default Pagination;
