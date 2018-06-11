/**
 *
 * GlobalPagination
 *
 */

import React from 'react';
import { map } from 'lodash';
import PropTypes from 'prop-types';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/anchor-is-valid */
class GlobalPagination extends React.Component {
  getLastPageNumber = () => Math.ceil(this.props.count / this.props.params._limit);

  handleDotsClick = (e) => e.preventDefault();

  handlePreviousPageClick = (e) => {
    e.preventDefault();

    if (!this.isFirstPage()) {
      const target = {
        name: 'params._page',
        value: this.props.params._page - 1,
      };
      this.props.onChangeParams({ target });
    }
  }

  handleNextPageClick = (e) => {
    e.preventDefault();

    if (!this.isLastPage()) {
      const target = {
        name: 'params._page',
        value: this.props.params._page + 1,
      };
      this.props.onChangeParams({ target });
    }
  }

  handleFirstPageClick = (e) => {
    e.preventDefault();
    const target = {
      name: 'params._page',
      value: 1,
    };
    this.props.onChangeParams({ target });
  }

  handleLastPageClick = (e) => {
    e.preventDefault();
    const target = {
      name: 'params._page',
      value: this.getLastPageNumber(),
    };
    this.props.onChangeParams({ target });
  }

  isFirstPage = () => this.props.params._page === 1;

  isLastPage = () => this.props.params._page === this.getLastPageNumber();

  needAfterLinksDots = () => this.props.params._page < this.getLastPageNumber() - 1;

  needPreviousLinksDots = () => this.props.params._page > 3;

  renderLinks = () => {
    // Init variables
    const linksOptions = [];

    // Add active page link
    linksOptions.push({
      value: this.props.params._page,
      isActive: true,
      handleClick: e => e.preventDefault(),
    });

    // Add previous page link
    if (!this.isFirstPage()) {
      linksOptions.unshift({
        value: this.props.params._page - 1,
        isActive: false,
        handleClick: this.handlePreviousPageClick,
      });
    }

    // Add next page link
    if (!this.isLastPage() && this.props.count > this.props.params._limit) {
      linksOptions.push({
        value: this.props.params._page + 1,
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

GlobalPagination.defaultProps = {
  count: 0,
  onChangeParams: () => {},
  params: {
    _page: 1,
    _limit: 10,
  },
};

GlobalPagination.propTypes = {
  count: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.bool,
  ]),
  onChangeParams: PropTypes.func,
  params: PropTypes.shape({
    _page: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    _limit: PropTypes.number,
  }),
};

export default GlobalPagination;
