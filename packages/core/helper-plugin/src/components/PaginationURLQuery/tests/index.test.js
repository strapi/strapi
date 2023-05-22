/**
 *
 * Tests for PaginationURLQuery
 *
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import PaginationURLQuery from '../index';

const messages = {
  'components.pagination.go-to': 'Go to page {page}',
  'components.pagination.go-to-previous': 'Go to previous page',
  'components.pagination.remaining-links': 'And {number} other links',
  'components.pagination.go-to-next': 'Go to next page',
};

const makeApp = (history, pageCount) => (
  <Router history={history}>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={messages} textComponent="span">
        <PaginationURLQuery pagination={{ pageCount }} />
      </IntlProvider>
    </ThemeProvider>
  </Router>
);

describe('<PaginationURLQuery />', () => {
  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    const {
      container: { firstChild },
    } = render(makeApp(history, 1));

    expect(firstChild).toMatchInlineSnapshot(`
      .c3 {
        border: 0;
        -webkit-clip: rect(0 0 0 0);
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      .c6 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: revert;
        color: #32324d;
      }

      .c0 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        gap: 4px;
      }

      .c1 {
        padding: 12px;
        border-radius: 4px;
        -webkit-text-decoration: none;
        text-decoration: none;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        position: relative;
        outline: none;
      }

      .c1:after {
        -webkit-transition-property: all;
        transition-property: all;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -4px;
        bottom: -4px;
        left: -4px;
        right: -4px;
        border: 2px solid transparent;
      }

      .c1:focus-visible {
        outline: none;
      }

      .c1:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c4 {
        padding: 12px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        -webkit-text-decoration: none;
        text-decoration: none;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        position: relative;
        outline: none;
      }

      .c4:after {
        -webkit-transition-property: all;
        transition-property: all;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -4px;
        bottom: -4px;
        left: -4px;
        right: -4px;
        border: 2px solid transparent;
      }

      .c4:focus-visible {
        outline: none;
      }

      .c4:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c5 {
        color: #271fe0;
        background: #ffffff;
      }

      .c5:hover {
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c2 {
        font-size: 0.6875rem;
        pointer-events: none;
      }

      .c2 svg path {
        fill: #c0c0cf;
      }

      .c2:focus svg path,
      .c2:hover svg path {
        fill: #c0c0cf;
      }

      <nav
        aria-label="Pagination"
        class=""
      >
        <ol
          class="c0"
        >
          <li>
            <a
              aria-current="page"
              aria-disabled="true"
              class="c1 c2 active"
              href="/"
              tabindex="-1"
            >
              <div
                class="c3"
              >
                Go to previous page
              </div>
              <svg
                aria-hidden="true"
                fill="none"
                height="1rem"
                viewBox="0 0 10 16"
                width="1rem"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.88 14.12 3.773 8 9.88 1.88 8 0 0 8l8 8 1.88-1.88Z"
                  fill="#32324D"
                />
              </svg>
            </a>
          </li>
          <li>
            <a
              aria-current="page"
              class="c4 c5 active"
              href="/?page=1"
            >
              <div
                class="c3"
              >
                Go to page 1
              </div>
              <span
                aria-hidden="true"
                class="c6"
              >
                1
              </span>
            </a>
          </li>
          <li>
            <a
              aria-current="page"
              aria-disabled="true"
              class="c1 c2 active"
              href="/"
              tabindex="-1"
            >
              <div
                class="c3"
              >
                Go to next page
              </div>
              <svg
                aria-hidden="true"
                fill="none"
                height="1rem"
                viewBox="0 0 10 16"
                width="1rem"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 1.88 6.107 8 0 14.12 1.88 16l8-8-8-8L0 1.88Z"
                  fill="#32324D"
                />
              </svg>
            </a>
          </li>
        </ol>
      </nav>
    `);
  });

  it('should display 3 links when the active page is 1 and the pageCount is greater than 5', () => {
    const history = createMemoryHistory();
    render(makeApp(history, 10));

    expect(screen.getByText('Go to page 1')).toBeInTheDocument();
    expect(screen.getByText('Go to page 2')).toBeInTheDocument();
    expect(screen.queryByText('Go to page 3')).not.toBeInTheDocument();
    expect(screen.getByText('And 8 other links')).toBeInTheDocument();
    expect(screen.getByText('Go to page 10')).toBeInTheDocument();
  });

  it('should change the page correctly', async () => {
    const history = createMemoryHistory();
    history.push({ pathname: '/test', search: 'page=3&pageSize=10&sort=firstname' });
    render(makeApp(history, 10));

    expect(screen.getByText('Go to page 1')).toBeInTheDocument();
    expect(screen.getByText('Go to page 2')).toBeInTheDocument();
    expect(screen.queryByText('Go to page 3')).toBeInTheDocument();
    expect(screen.queryByText('Go to page 4')).toBeInTheDocument();
    expect(screen.queryByText('Go to page 5')).not.toBeInTheDocument();
    expect(screen.getByText('And 6 other links')).toBeInTheDocument();
    expect(screen.getByText('Go to page 10')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Go to page 4'));

    await waitFor(() => {
      expect(history.location.pathname).toEqual('/test');
      expect(history.location.search).toEqual('?page=4&pageSize=10&sort=firstname');
      expect(screen.queryByText('Go to page 5')).toBeInTheDocument();
    });
  });

  it('should display the dots correctly', () => {
    const history = createMemoryHistory();
    history.push({ pathname: '/test', search: 'page=5&pageSize=10&sort=firstname' });
    const {
      container: { firstChild },
    } = render(makeApp(history, 10));

    expect(firstChild).toMatchSnapshot();
  });

  it('should work when the pageCount is inferior or equal to 4', async () => {
    const history = createMemoryHistory();
    history.push({ pathname: '/test', search: 'page=1&pageSize=10&sort=firstname' });
    const {
      container: { firstChild },
    } = render(makeApp(history, 4));

    expect(firstChild).toMatchSnapshot();

    fireEvent.click(screen.getByText('Go to page 2'));

    await waitFor(() => {
      expect(history.location.pathname).toEqual('/test');
      expect(history.location.search).toEqual('?page=2&pageSize=10&sort=firstname');
      expect(screen.getByText('Go to page 1')).toBeInTheDocument();
      expect(screen.getByText('Go to page 2')).toBeInTheDocument();
      expect(screen.queryByText('Go to page 3')).toBeInTheDocument();
      expect(screen.queryByText('Go to page 4')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Go to page 3'));

    await waitFor(() => {
      expect(history.location.pathname).toEqual('/test');
      expect(history.location.search).toEqual('?page=3&pageSize=10&sort=firstname');
      expect(screen.getByText('Go to page 1')).toBeInTheDocument();
      expect(screen.getByText('Go to page 2')).toBeInTheDocument();
      expect(screen.queryByText('Go to page 3')).toBeInTheDocument();
      expect(screen.queryByText('Go to page 4')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Go to page 4'));

    await waitFor(() => {
      expect(history.location.pathname).toEqual('/test');
      expect(history.location.search).toEqual('?page=4&pageSize=10&sort=firstname');
      expect(screen.getByText('Go to page 1')).toBeInTheDocument();
      expect(screen.getByText('Go to page 2')).toBeInTheDocument();
      expect(screen.queryByText('Go to page 3')).toBeInTheDocument();
      expect(screen.queryByText('Go to page 4')).toBeInTheDocument();
    });
  });
});
