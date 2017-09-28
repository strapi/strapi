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
      this.props.changePage(this.props.currentPage - 1);
    }
  }

  handleNextPageClick = (e) => {
    e.preventDefault();

    if (!this.isLastPage()) {
      this.props.changePage(this.props.currentPage + 1);
    }
  }

  handleFirstPageClick = (e) => {
    e.preventDefault();

    this.props.changePage(1);
  }

  handleLastPageClick = (e) => {
    e.preventDefault();

    this.props.changePage(this.getLastPageNumber());
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
      onClick: e => {
        e.preventDefault();
      },
    });

    // Add previous page link
    if (!this.isFirstPage()) {
      linksOptions.unshift({
        value: this.props.currentPage - 1,
        isActive: false,
        onClick: this.handlePreviousPageClick,
      });
    }

    // Add next page link
    if (!this.isLastPage() && this.props.count > this.props.limit) {
      linksOptions.push({
        value: this.props.currentPage + 1,
        isActive: false,
        onClick: this.handleNextPageClick,
      });
    }

    // Add previous link dots and first page link
    if (this.needPreviousLinksDots()) {
      linksOptions.unshift({
        value: '...',
        isActive: false,
        onClick: this.handleDotsClick,
      });
      linksOptions.unshift({
        value: 1,
        isActive: false,
        onClick: this.handleFirstPageClick,
      });
    }

    // Add next link dots and last page link
    if (this.needAfterLinksDots()) {
      linksOptions.push({
        value: '...',
        isActive: false,
        onClick: this.handleDotsClick,
      });
      linksOptions.push({
        value: this.getLastPageNumber(),
        isActive: false,
        onClick: this.handleLastPageClick,
      });
    }

    // Generate links
    return (
      map(linksOptions, (linksOption, key) => (
        <li
          className={`${linksOption.isActive && styles.navLiActive}`}
          key={key}
        >
          <a href disabled={linksOption.isActive} onClick={linksOption.onClick}>
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
            href
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
            href
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
  changePage: PropTypes.func.isRequired,
  count: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.bool,
  ]).isRequired,
  currentPage: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
};

export default Pagination;
