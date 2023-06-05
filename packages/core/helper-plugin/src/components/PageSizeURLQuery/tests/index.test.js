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

jest.mock('../../../features/Tracking', () => ({
  useTracking: () => ({
    trackUsage: jest.fn(),
  }),
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
      .c3 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c10 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
      }

      .c15 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c5 {
        background: #ffffff;
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        width: 100%;
        cursor: default;
      }

      .c8 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c14 {
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
        gap: 4px;
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
        gap: 16px;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c9 {
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
        gap: 12px;
      }

      .c4 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c7 {
        border: 1px solid #dcdce4;
        min-height: 2rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c7[aria-disabled='true'] {
        color: #666687;
      }

      .c7:focus-visible {
        outline: none;
      }

      .c7:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c13 > svg {
        width: 0.375rem;
      }

      .c13 > svg > path {
        fill: #666687;
      }

      .c11 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c12 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        gap: 4px;
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
      }

      .c16[data-state='checked'] .c2 {
        font-weight: bold;
        color: #4945ff;
      }

      <div
        class="c0"
      >
        <div
          class=""
        >
          <div
            class="c1"
          >
            <label
              class="c2 c3 c4"
              for="2"
            />
            <div
              aria-autocomplete="none"
              aria-controls="radix-0"
              aria-describedby="2-hint 2-error"
              aria-expanded="false"
              class="c5 c6 c7"
              data-state="closed"
              dir="ltr"
              id="2"
              overflow="hidden"
              role="combobox"
              tabindex="0"
            >
              <span
                class="c8 c9"
              >
                <span
                  class="c2 c10 c11"
                >
                  <span
                    class="c12"
                  >
                    10
                  </span>
                </span>
              </span>
              <span
                class="c9"
              >
                <span
                  aria-hidden="true"
                  class="c13"
                >
                  <svg
                    fill="none"
                    height="1rem"
                    viewBox="0 0 14 8"
                    width="1rem"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      clip-rule="evenodd"
                      d="M14 .889a.86.86 0 0 1-.26.625L7.615 7.736A.834.834 0 0 1 7 8a.834.834 0 0 1-.615-.264L.26 1.514A.861.861 0 0 1 0 .889c0-.24.087-.45.26-.625A.834.834 0 0 1 .875 0h12.25c.237 0 .442.088.615.264a.86.86 0 0 1 .26.625Z"
                      fill="#32324D"
                      fill-rule="evenodd"
                    />
                  </svg>
                </span>
              </span>
            </div>
          </div>
        </div>
        <div
          class="c14"
        >
          <label
            class="c2 c15"
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
