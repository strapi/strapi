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
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import PageSizeURLQuery from '../index';

jest.mock('../../../hooks/useTracking', () => () => ({
  trackUsage: jest.fn(),
}));

const messages = {
  'components.PageFooter.select': 'Entries per page',
};

const makeApp = (history) => (
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
      .c13 {
        padding-left: 8px;
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
      }

      .c5 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c5:focus {
        outline: none;
      }

      .c5[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c8 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c10 {
        padding-left: 12px;
      }

      .c1 {
        -webkit-align-items: stretch;
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c3 {
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
      }

      .c6 {
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c9 {
        color: #32324d;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c2 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c4 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
        min-height: 2rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c4:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c11 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c11 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c11 svg path {
        fill: #666687;
      }

      .c12 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c12 svg {
        width: 0.375rem;
      }

      .c7 {
        width: 100%;
      }

      .c14 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      <div
        class="c0"
      >
        <div>
          <div
            class="c1 c2"
          >
            <div
              class="c3 c4"
            >
              <button
                aria-disabled="false"
                aria-expanded="false"
                aria-haspopup="listbox"
                aria-label="Entries per page"
                aria-labelledby="select-1-label select-1-content"
                class="c5"
                id="select-1"
                type="button"
              />
              <div
                class="c6 c7"
              >
                <div
                  class="c3"
                >
                  <div
                    class="c8"
                  >
                    <span
                      class="c9"
                      id="select-1-content"
                    >
                      10
                    </span>
                  </div>
                </div>
                <div
                  class="c3"
                >
                  <button
                    aria-hidden="true"
                    class="c10 c11 c12"
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
          class="c13"
        >
          <label
            class="c14"
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
