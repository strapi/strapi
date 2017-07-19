/**
 *
 * Pagination
 *
 */

import React from 'react';

import styles from './styles.scss';

class Pagination extends React.Component {
  constructor(props) {
    super(props);
    this.onGoPreviousPageClicked = this.onGoPreviousPageClicked.bind(this);
    this.onGoNextPageClicked = this.onGoNextPageClicked.bind(this);
    this.onGoFirstPageClicked = this.onGoFirstPageClicked.bind(this);
    this.onGoLastPageClicked = this.onGoLastPageClicked.bind(this);
  }
  /**
   * Triggered on dots click
   *
   * Simply prevent link default behavior
   *
   * @param e {Object} Click event
   */
  onDotsClicked(e) {
    e.preventDefault();
  }

  /**
   * Triggered on previous page click
   *
   * Prevent link default behavior and go to previous page
   *
   * @param e {Object} Click event
   */
  onGoPreviousPageClicked(e) {
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
  onGoNextPageClicked(e) {
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
  onGoFirstPageClicked(e) {
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
  onGoLastPageClicked(e) {
    e.preventDefault();

    this.props.changePage(this.getLastPageNumber());
  }

  /**
   * Return the last page number
   *
   * @returns {number}
   */
  getLastPageNumber() {
    return Math.ceil(this.props.count / this.props.limit);
  }

  /**
   * Check if the current page is the first one or not
   *
   * @returns {boolean}
   */
  isFirstPage() {
    return this.props.currentPage === 1;
  }

  /**
   * Check if the previous links dots
   * should be displayed or not
   *
   * @returns {boolean}
   */
  needPreviousLinksDots() {
    return this.props.currentPage > 3;
  }
  /**
   * Check if the after links dots
   * should be displayed or not
   *
   * @returns {boolean}
   */
  needAfterLinksDots() {
    return this.props.currentPage < this.getLastPageNumber() - 1;
  }

  /**
   * Check if the current page is the last one
   *
   * @returns {boolean}
   */
  isLastPage() {
    return this.props.currentPage === this.getLastPageNumber();
  }

  render() {
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
    const links = linksOptions.map((linksOption, i) => (
      <li
        className={`${styles.navLi} ${linksOption.isActive && styles.navLiActive}`}
        key={i}
      >
        <a href disabled={linksOption.isActive} onClick={linksOption.onClick}>
          {linksOption.value}
        </a>
      </li>
    ));

    return (
      <div className={styles.pagination}>
        <a
          href
          className={`
             ${styles.paginationNavigator}
             ${styles.paginationNavigatorPrevious}
             ${this.isFirstPage() && styles.paginationNavigatorDisabled}
           `}
          onClick={this.onGoPreviousPageClicked}
          disabled={this.isFirstPage()}
        >
          <i className="ion ion-chevron-left" />
        </a>
        <div className={styles.separator} />
        <nav className={styles.nav}>
          <ul className={styles.navUl}>
            {links}
          </ul>
        </nav>
        <a
          href
          className={`
             ${styles.paginationNavigator}
             ${styles.paginationNavigatorNext}
             ${this.isLastPage() && styles.paginationNavigatorDisabled}
           `}
          onClick={this.onGoNextPageClicked}
          disabled={this.isLastPage()}
        >
          <i className="ion ion-chevron-right" />
        </a>
      </div>
    );
  }
}

Pagination.propTypes = {
  changePage: React.PropTypes.func.isRequired,
  count: React.PropTypes.oneOfType([
    React.PropTypes.number,
    React.PropTypes.bool,
  ]),
  currentPage: React.PropTypes.number.isRequired,
  limit: React.PropTypes.number.isRequired,
};

export default Pagination;
