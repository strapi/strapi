/**
 *
 * Tests for PageSizeURLQuery
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import PageSizeURLQuery from '../index';

jest.mock('../../../hooks/useTracking', () => () => ({
  trackUsage: jest.fn(),
}));

const messages = {
  'components.PageFooter.select': 'Entries per page',
};

const makeApp = history => (
  <Router history={history}>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={messages} textComponent="span">
        <PageSizeURLQuery />
      </IntlProvider>
    </ThemeProvider>
  </Router>
);

describe('<PageSizeURLQuery />', () => {
  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    const {
      container: { firstChild },
      getByText,
    } = render(makeApp(history));

    expect(firstChild).toMatchInlineSnapshot(`
      .c12 {
        padding-left: 8px;
      }

      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c3 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c3:focus {
        outline: none;
      }

      .c8 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c7 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c9 {
        padding-left: 12px;
      }

      .c4 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c6 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c1 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c1 > * + * {
        margin-top: 0px;
      }

      .c2 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
      }

      .c2:focus-within {
        border: 1px solid #4945ff;
      }

      .c10 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c10 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c10 svg path {
        fill: #666687;
      }

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c11 svg {
        width: 0.375rem;
      }

      .c5 {
        min-height: 2.5rem;
      }

      .c13 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      <div
        class="c0"
      >
        <div>
          <div
            class="c1"
          >
            <div
              class="c2"
            >
              <button
                aria-disabled="false"
                aria-expanded="false"
                aria-haspopup="listbox"
                aria-label="Entries per page"
                aria-labelledby="select-1-label select-1-content"
                class="c3"
                id="select-1"
                type="button"
              />
              <div
                class="c4 c5"
              >
                <div
                  class="c6"
                >
                  <div
                    class="c7"
                  >
                    <span
                      class="c8"
                      id="select-1-content"
                    >
                      10
                    </span>
                  </div>
                </div>
                <div
                  class="c6"
                >
                  <button
                    aria-hidden="true"
                    class="c9 c10 c11"
                    tabindex="-1"
                    type="button"
                  >
                    <svg
                      fill="none"
                      height="1em"
                      viewBox="0 0 14 8"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        clip-rule="evenodd"
                        d="M14 .889a.86.86 0 01-.26.625L7.615 7.736A.834.834 0 017 8a.834.834 0 01-.615-.264L.26 1.514A.861.861 0 010 .889c0-.24.087-.45.26-.625A.834.834 0 01.875 0h12.25c.237 0 .442.088.615.264a.86.86 0 01.26.625z"
                        fill="#32324D"
                        fill-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="c12"
        >
          <label
            class="c13"
            for="page-size"
          >
            Entries per page
          </label>
        </div>
      </div>
    `);

    expect(getByText('10')).toBeInTheDocument();
  });

  it('should display the pageSize correctly', () => {
    const history = createMemoryHistory();

    history.push({ search: 'pageSize=50' });

    const { getByText } = render(makeApp(history));

    expect(getByText('50')).toBeInTheDocument();
  });
});
