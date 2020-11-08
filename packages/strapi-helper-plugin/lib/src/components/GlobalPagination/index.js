/**
 *
 * GlobalPagination
 *
 */

import React from 'react';
import { map } from 'lodash';
import PropTypes from 'prop-types';
import cn from 'classnames';
import Wrapper from './Wrapper';

class GlobalPagination extends React.Component {
  getLastPageNumber = () => Math.ceil(this.props.count / this.props.params._limit) || 1;

  handleDotsClick = e => e.preventDefault();

  handlePreviousPageClick = e => {
    e.preventDefault();

    if (!this.isFirstPage()) {
      const target = {
        name: 'params._page',
        value: this.props.params._page - 1,
      };
      this.props.onChangeParams({ target });
    }
  };

  handleNextPageClick = e => {
    e.preventDefault();

    if (!this.isLastPage()) {
      const target = {
        name: 'params._page',
        value: this.props.params._page + 1,
      };
      this.props.onChangeParams({ target });
    }
  };

  handleFirstPageClick = e => {
    e.preventDefault();
    const target = {
      name: 'params._page',
      value: 1,
    };
    this.props.onChangeParams({ target });
  };

  handleLastPageClick = e => {
    e.preventDefault();
    const target = {
      name: 'params._page',
      value: this.getLastPageNumber(),
    };
    this.props.onChangeParams({ target });
  };

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
    return map(linksOptions, (linksOption, key) => (
      <li className={cn(linksOption.isActive && 'navLiActive')} key={key}>
        <a href="" disabled={linksOption.isActive} onClick={linksOption.handleClick}>
          {linksOption.value}
        </a>
      </li>
    ));
  };

  render() {
    return (
      <Wrapper>
        <div>
          <a
            href=""
            className="paginationNavigator"
            onClick={this.handlePreviousPageClick}
            disabled={this.isFirstPage()}
          >
            <i className="fa fa-chevron-left" aria-hidden="true" />
          </a>
          <nav className="navWrapper">
            <ul className="navUl">{this.renderLinks()}</ul>
          </nav>
          <a
            href=""
            className="paginationNavigator"
            onClick={this.handleNextPageClick}
            disabled={this.isLastPage()}
          >
            <i className="fa fa-chevron-right" aria-hidden="true" />
          </a>
        </div>
      </Wrapper>
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
  count: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
  onChangeParams: PropTypes.func,
  params: PropTypes.shape({
    _page: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    _limit: PropTypes.number,
  }),
};

export default GlobalPagination;
