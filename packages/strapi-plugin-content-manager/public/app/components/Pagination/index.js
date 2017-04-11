/**
 *
 * Pagination
 *
 */

import React from 'react';

import styles from './styles.scss';

class Pagination extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      progress: -1,
    };
    this.onGoPreviousPageClicked = this.onGoPreviousPageClicked.bind(this);
    this.onGoNextPageClicked = this.onGoNextPageClicked.bind(this);
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
   * Check if the
   *
   * @returns {boolean}
   */
  needPreviousLinksDots() {
    return this.props.currentPage >= 3;
  }

  needAfterLinksDots() {
    return this.props.currentPage < this.lastPage() - 1;
  }

  /**
   * Return the last page number
   *
   * @returns {number}
   */
  lastPage() {
    return Math.ceil(this.props.count / this.props.limitPerPage);
  }

  /**
   * Check if the current page is the last one
   *
   * @returns {boolean}
   */
  isLastPage() {
    return this.props.currentPage === this.lastPage();
  }

  /**
   * Triggered on previous page click.
   *
   * Prevent link default behavior and go to previous page.
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
   * Triggered on next page click.
   *
   * Prevent link default behavior and go to next page.
   *
   * @param e {Object} Click event
   */
  onGoNextPageClicked(e) {
    e.preventDefault();

    if (!this.isLastPage()) {
      this.props.changePage(this.props.currentPage + 1);
    }
  }

  render() {
    // Init variables
    let beforeLinksDots;
    let afterLinksDots;
    const linksOptions = [];
    const dotsElem = (<li className={styles.navLi}><span>...</span></li>);

    // Add active page link
    linksOptions.push({
      value: this.props.currentPage,
      isActive: true,
      onClick: (e) => {
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
    if (!this.isLastPage()) {
      linksOptions.push({
        value: this.props.currentPage + 1,
        isActive: false,
        onClick: this.onGoNextPageClicked,
      });
    }

    // Add previous link dots
    if (this.needPreviousLinksDots()) {
      beforeLinksDots = dotsElem;
    }

    // Add next link dots
    if (this.needAfterLinksDots()) {
      afterLinksDots = dotsElem;
    }

    // Generate links
    const links = linksOptions.map((linksOption) => (
        <li className={`${styles.navLi} ${linksOption.isActive && styles.navLiActive}`} key={linksOption.value}>
          <a href disabled={linksOption.isActive} onClick={linksOption.onClick}>
            {linksOption.value}
          </a>
        </li>
      )
    );

    return (
      <div className={styles.pagination}>
        <a href
           className={`
             ${styles.paginationNavigator}
             ${styles.paginationNavigatorPrevious}
             ${this.isFirstPage() && styles.paginationNavigatorDisabled}
           `}
           onClick={this.onGoPreviousPageClicked}
           disabled={this.isFirstPage()}>
          <i className="ion ion-chevron-left"></i>
        </a>
        <div className={styles.separator}></div>
        <nav className={styles.nav}>
          <ul className={styles.navUl}>
            { beforeLinksDots }
            {links}
            { afterLinksDots }
          </ul>
        </nav>
        <a href
           className={`
             ${styles.paginationNavigator}
             ${styles.paginationNavigatorNext}
             ${this.isLastPage() && styles.paginationNavigatorDisabled}
           `}
           onClick={this.onGoNextPageClicked}
           disabled={this.isLastPage()}>
          <i className="ion ion-chevron-right"></i>
        </a>
      </div>
    );
  }
}

export default Pagination;
