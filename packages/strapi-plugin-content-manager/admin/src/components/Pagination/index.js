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
  /**
   * Triggered on dots click
   *
   * Simply prevent link default behavior
   *
   * @param e {Object} Click event
   */
  onDotsClicked = (e) => {
    e.preventDefault();
  }

  /**
   * Triggered on previous page click
   *
   * Prevent link default behavior and go to previous page
   *
   * @param e {Object} Click event
   */
  onGoPreviousPageClicked = (e) => {
    e.preventDefault();

    if (!this.isFirstPage()) {
      this.props.changePage(this.props.currentPage - 1);
    }
  }

  /**
   * Triggered on next page click
   *
   * Prevent link default behavior and go to next page
   *
   * @param e {Object} Click event
   */
  onGoNextPageClicked = (e) => {
    e.preventDefault();

    if (!this.isLastPage()) {
      this.props.changePage(this.props.currentPage + 1);
    }
  }
  /**
   * Triggered on first page click
   *
   * Prevent link default behavior and go to first page
   *
   * @param e {Object} Click event
   */
  onGoFirstPageClicked = (e) => {
    e.preventDefault();

    this.props.changePage(1);
  }

  /**
   * Triggered on last page click
   *
   * Prevent link default behavior and go to last page
   *
   * @param e {Object} Click event
   */
  onGoLastPageClicked = (e) => {
    e.preventDefault();

    this.props.changePage(this.getLastPageNumber());
  }

  /**
   * Return the last page number
   *
   * @returns {number}
   */
  getLastPageNumber = () => {
    return Math.ceil(this.props.count / this.props.limit);
  }

  /**
   * Check if the current page is the first one or not
   *
   * @returns {boolean}
   */
  isFirstPage = () => {
    return this.props.currentPage === 1;
  }

  /**
   * Check if the previous links dots
   * should be displayed or not
   *
   * @returns {boolean}
   */
  needPreviousLinksDots = () => {
    return this.props.currentPage > 3;
  }
  /**
   * Check if the after links dots
   * should be displayed or not
   *
   * @returns {boolean}
   */
  needAfterLinksDots = () => {
    return this.props.currentPage < this.getLastPageNumber() - 1;
  }

  /**
   * Check if the current page is the last one
   *
   * @returns {boolean}
   */
  isLastPage = () => {
    return this.props.currentPage === this.getLastPageNumber();
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
        onClick: this.onGoPreviousPageClicked,
      });
    }

    // Add next page link
    if (!this.isLastPage() && this.props.count > this.props.limit) {
      linksOptions.push({
        value: this.props.currentPage + 1,
        isActive: false,
        onClick: this.onGoNextPageClicked,
      });
    }

    // Add previous link dots and first page link
    if (this.needPreviousLinksDots()) {
      linksOptions.unshift({
        value: '...',
        isActive: false,
        onClick: this.onDotsClicked,
      });
      linksOptions.unshift({
        value: 1,
        isActive: false,
        onClick: this.onGoFirstPageClicked,
      });
    }

    // Add next link dots and last page link
    if (this.needAfterLinksDots()) {
      linksOptions.push({
        value: '...',
        isActive: false,
        onClick: this.onDotsClicked,
      });
      linksOptions.push({
        value: this.getLastPageNumber(),
        isActive: false,
        onClick: this.onGoLastPageClicked,
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
            onClick={this.onGoPreviousPageClicked}
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
            onClick={this.onGoNextPageClicked}
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
