import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useTracking } from '@strapi/helper-plugin';
import MarketPlacePage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  pxToRem: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <MarketPlacePage />
    </IntlProvider>
  </ThemeProvider>
);

describe('Marketplace coming soon', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
        padding-bottom: 56px;
      }

      .c4 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c9 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c0 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c2 {
        overflow-x: hidden;
      }

      .c5 {
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

      .c7 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c8 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c17 {
        padding-top: 12px;
      }

      .c18 {
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

      .c13 {
        padding-bottom: 32px;
      }

      .c10 {
        background: #ffffff;
        padding-top: 56px;
        padding-bottom: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c21 {
        padding-top: 24px;
      }

      .c22 {
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

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c11 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c11 > * + * {
        margin-top: 0px;
      }

      .c23 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c23 > * + * {
        margin-left: 8px;
      }

      .c27 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c24 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        background: #ffffff;
        border: 1px solid #dcdce4;
        position: relative;
        outline: none;
      }

      .c24 svg {
        height: 12px;
        width: 12px;
      }

      .c24 svg > g,
      .c24 svg path {
        fill: #ffffff;
      }

      .c24[aria-disabled='true'] {
        pointer-events: none;
      }

      .c24:after {
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

      .c24:focus-visible {
        outline: none;
      }

      .c24:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c25 {
        padding: 10px 16px;
        background: #4945ff;
        border: none;
        border-radius: 4px;
        border: 1px solid #4945ff;
        background: #4945ff;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c25 .sc-jYmNlR {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c25 .c26 {
        color: #ffffff;
      }

      .c25[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c25[aria-disabled='true'] .c26 {
        color: #666687;
      }

      .c25[aria-disabled='true'] svg > g,
      .c25[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c25[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c25[aria-disabled='true']:active .c26 {
        color: #666687;
      }

      .c25[aria-disabled='true']:active svg > g,
      .c25[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c25:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c25:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c3:focus-visible {
        outline: none;
      }

      .c15 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c16 {
        color: #271fe0;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c19 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c20 {
        text-align: center;
      }

      .c14 {
        width: 11.875rem;
      }

      .c12 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      <div
        class="c0"
      >
        <div
          class="c1 c2"
        >
          <main
            aria-labelledby="main-content-title"
            class="c3"
            id="main-content"
            tabindex="-1"
          >
            <div
              style="height: 0px;"
            >
              <div
                class="c4"
                data-strapi-header="true"
              >
                <div
                  class="c5"
                >
                  <div
                    class="c6"
                  >
                    <h1
                      class="c7"
                    >
                      Marketplace
                    </h1>
                  </div>
                </div>
                <p
                  class="c8"
                >
                  Get more out of Strapi
                </p>
              </div>
            </div>
            <div
              class="c9"
            >
              <div
                class="c10 c11 c12"
              >
                <div
                  class="c13"
                >
                  <img
                    alt="marketplace illustration"
                    class="c14"
                    src="IMAGE_MOCK"
                  />
                </div>
                <span
                  class="c15"
                >
                  A new way to make Strapi awesome.
                </span>
                <span
                  class="c16"
                >
                  A new way to make Strapi awesome.
                </span>
                <div
                  class="c17 c18"
                >
                  <span
                    class="c19 c20"
                  >
                    The new marketplace will help you get more out of Strapi. We are working hard to offer the best experience to discover and install plugins.
                  </span>
                </div>
                <div
                  class="c21 c22 c23"
                >
                  <a
                    aria-disabled="false"
                    class="c24 c25"
                    href="https://strapi.io/blog/strapi-market-is-coming-soon"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <span
                      class="c26 c27"
                    >
                      Read our blog post
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `);
  });

  it('sends an event when the user enters the marketplace', () => {
    const trackUsage = jest.fn();
    useTracking.mockImplementation(() => ({ trackUsage }));
    render(App);

    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
  });
});
