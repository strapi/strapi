import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import UseCasePage from '../index';

jest.mock('../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale() {},
  localeNames: { en: 'English' },
  messages: ['test'],
}));
jest.mock('../../../hooks/useConfigurations', () => () => ({
  logos: {
    auth: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
  },
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  auth: {
    getUserInfo: jest.fn(() => ({
      firstname: 'Michka',
      email: 'michka@ronronscelestes.com',
    })),
  },
}));

const history = createMemoryHistory();

const App = (
  <IntlProvider messages={{}} textComponent="span" locale="en">
    <ThemeProvider theme={lightTheme}>
      <Router history={history}>
        <UseCasePage />
      </Router>
    </ThemeProvider>
  </IntlProvider>
);

describe('Admin | UseCasePage', () => {
  it('renders and matches the snapshot', () => {
    const { container: firstChild } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c38 {
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

      .c9 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
      }

      .c21 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c24 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c26 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #666687;
      }

      .c31 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 600;
        color: #ffffff;
      }

      .c37 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4945ff;
      }

      .c1 {
        padding-top: 24px;
        padding-right: 40px;
      }

      .c3 {
        background: #ffffff;
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        width: 100%;
        cursor: default;
      }

      .c6 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c13 {
        padding-top: 8px;
        padding-bottom: 64px;
      }

      .c15 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c17 {
        padding-bottom: 32px;
      }

      .c20 {
        padding-top: 24px;
        padding-bottom: 4px;
        width: 15.625rem;
      }

      .c27 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        width: 100%;
        cursor: pointer;
      }

      .c33 {
        padding-top: 16px;
      }

      .c34 {
        background: transparent;
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
        -webkit-box-pack: end;
        -webkit-justify-content: flex-end;
        -ms-flex-pack: end;
        justify-content: flex-end;
      }

      .c2 {
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

      .c4 {
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

      .c7 {
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

      .c18 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c23 {
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
        gap: 24px;
      }

      .c28 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        gap: 8px;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c32 {
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c35 {
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
        gap: 8px;
      }

      .c36 {
        border: none;
        position: relative;
        outline: none;
      }

      .c36[aria-disabled='true'] {
        pointer-events: none;
      }

      .c36[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c36 svg path {
        fill: #4945ff;
      }

      .c36:after {
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

      .c36:focus-visible {
        outline: none;
      }

      .c36:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c29 {
        position: relative;
        outline: none;
      }

      .c29 > svg {
        height: 12px;
        width: 12px;
      }

      .c29 > svg > g,
      .c29 > svg path {
        fill: #ffffff;
      }

      .c29[aria-disabled='true'] {
        pointer-events: none;
      }

      .c29:after {
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

      .c29:focus-visible {
        outline: none;
      }

      .c29:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c30 {
        height: 2.5rem;
      }

      .c30 svg {
        height: 0.75rem;
        width: auto;
      }

      .c30[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c30[aria-disabled='true'] .c8 {
        color: #666687;
      }

      .c30[aria-disabled='true'] svg > g,.c30[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c30[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c30[aria-disabled='true']:active .c8 {
        color: #666687;
      }

      .c30[aria-disabled='true']:active svg > g,.c30[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c30:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c30:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c30 svg > g,
      .c30 svg path {
        fill: #ffffff;
      }

      .c25 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c5 {
        border: 1px solid #dcdce4;
        min-height: 2.5rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c5[aria-disabled='true'] {
        color: #666687;
      }

      .c5:focus-visible {
        outline: none;
      }

      .c5:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c12 > svg {
        width: 0.375rem;
      }

      .c12 > svg > path {
        fill: #666687;
      }

      .c10 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        gap: 4px;
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
      }

      .c39[data-state='checked'] .c8 {
        font-weight: bold;
        color: #4945ff;
      }

      .c14:focus-visible {
        outline: none;
      }

      .c19 {
        height: 4.5rem;
      }

      .c16 {
        margin: 0 auto;
        width: 552px;
      }

      .c22 {
        text-align: center;
      }

      <div>
        <div>
          <header
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class=""
              >
                <div
                  class="c2"
                >
                  <div
                    aria-autocomplete="none"
                    aria-controls="radix-:r3:"
                    aria-describedby=":r0:-hint :r0:-error"
                    aria-expanded="false"
                    class="c3 c4 c5"
                    data-state="closed"
                    dir="ltr"
                    id=":r0:"
                    overflow="hidden"
                    role="combobox"
                    tabindex="0"
                  >
                    <span
                      class="c6 c7"
                    >
                      <span
                        class="c8 c9 c10"
                      >
                        <span
                          class="c11"
                        >
                          English
                        </span>
                      </span>
                    </span>
                    <span
                      class="c7"
                    >
                      <span
                        aria-hidden="true"
                        class="c12"
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
            </div>
          </header>
          <div
            class="c13"
          >
            <main
              aria-labelledby="usecase-title"
              class="c14"
              id="main-content"
              tabindex="-1"
            >
              <div
                class="c15 c16"
              >
                <form>
                  <div
                    class="c17 c18"
                  >
                    <img
                      alt=""
                      aria-hidden="true"
                      class="c19"
                      src="customAuthLogo.png"
                    />
                    <div
                      class="c20"
                    >
                      <h1
                        class="c8 c21 c22"
                        id="usecase-title"
                      >
                        Tell us a bit more about yourself
                      </h1>
                    </div>
                  </div>
                  <div
                    class="c23"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c2"
                      >
                        <label
                          class="c8 c24 c25"
                          for="usecase"
                        >
                          What type of work do you do?
                        </label>
                        <div
                          aria-autocomplete="none"
                          aria-controls="radix-:r7:"
                          aria-describedby="usecase-hint usecase-error"
                          aria-expanded="false"
                          aria-label="What type of work do you do?"
                          class="c3 c4 c5"
                          data-state="closed"
                          dir="ltr"
                          id="usecase"
                          overflow="hidden"
                          role="combobox"
                          tabindex="0"
                        >
                          <span
                            class="c6 c7"
                          >
                            <span
                              class="c8 c26 c10"
                            >
                              <span
                                class="c11"
                              />
                            </span>
                          </span>
                          <span
                            class="c7"
                          >
                            <span
                              aria-hidden="true"
                              class="c12"
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
                    <button
                      aria-disabled="true"
                      class="c27 c28 c29 c30"
                      disabled=""
                      type="submit"
                    >
                      <span
                        class="c8 c31"
                      >
                        Finish
                      </span>
                    </button>
                  </div>
                </form>
              </div>
              <div
                class="c32"
              >
                <div
                  class="c33"
                >
                  <button
                    aria-disabled="false"
                    class="c34 c35 c36"
                    type="button"
                  >
                    <span
                      class="c8 c37"
                    >
                      Skip this question
                    </span>
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div
          class="c38"
        >
          <p
            aria-live="polite"
            aria-relevant="all"
            id="live-region-log"
            role="log"
          />
          <p
            aria-live="polite"
            aria-relevant="all"
            id="live-region-status"
            role="status"
          />
          <p
            aria-live="assertive"
            aria-relevant="all"
            id="live-region-alert"
            role="alert"
          />
        </div>
      </div>
    `);
  });

  it('should not show Other input if select value is not Other', async () => {
    const { queryByTestId } = render(App);
    const user = userEvent.setup();

    const selectInput = screen.getByRole('combobox', { name: 'What type of work do you do?' });

    await user.click(selectInput);

    await user.click(screen.getByRole('option', { name: 'Front-end developer' }));

    expect(queryByTestId('other')).not.toBeInTheDocument();
  });

  it('should show Other input if select value is Other', async () => {
    const { queryByTestId } = render(App);
    const user = userEvent.setup();

    const selectInput = screen.getByRole('combobox', { name: 'What type of work do you do?' });

    await user.click(selectInput);

    await user.click(screen.getByRole('option', { name: 'Other' }));

    expect(queryByTestId('other')).toBeInTheDocument();
  });
});
