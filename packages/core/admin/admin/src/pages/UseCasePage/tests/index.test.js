import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
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
      .c39 {
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

      .c2 {
        padding-top: 24px;
        padding-right: 40px;
      }

      .c7 {
        padding-left: 8px;
      }

      .c9 {
        padding-top: 8px;
        padding-bottom: 64px;
      }

      .c11 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c13 {
        padding-bottom: 32px;
      }

      .c16 {
        padding-top: 24px;
        padding-bottom: 4px;
        width: 15.625rem;
      }

      .c28 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c30 {
        padding-left: 12px;
      }

      .c36 {
        padding-top: 16px;
      }

      .c1 {
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

      .c14 {
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

      .c19 {
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

      .c23 {
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

      .c26 {
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c6 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 1.14;
        color: #32324d;
      }

      .c17 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c22 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c29 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #666687;
      }

      .c34 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 600;
        line-height: 1.14;
        color: #32324d;
      }

      .c38 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4945ff;
      }

      .c20 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c20 > * + * {
        margin-top: 24px;
      }

      .c21 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c21 > * + * {
        margin-top: 4px;
      }

      .c3 {
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

      .c3 svg {
        height: 12px;
        width: 12px;
      }

      .c3 svg > g,
      .c3 svg path {
        fill: #ffffff;
      }

      .c3[aria-disabled='true'] {
        pointer-events: none;
      }

      .c3:after {
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

      .c3:focus-visible {
        outline: none;
      }

      .c3:focus-visible:after {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        background-color: #4945ff;
        border: 1px solid #4945ff;
        height: 2rem;
        padding-left: 16px;
        padding-right: 16px;
        border: 1px solid transparent;
        background: transparent;
      }

      .c4 .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c4 .c5 {
        color: #ffffff;
      }

      .c4[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c4[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c4[aria-disabled='true'] svg > g,
      .c4[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c4[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c4[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c4[aria-disabled='true']:active svg > g,
      .c4[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c4:hover {
        background-color: #f6f6f9;
      }

      .c4:active {
        border: 1px solid undefined;
        background: undefined;
      }

      .c4 .c5 {
        color: #32324d;
      }

      .c4 svg > g,
      .c4 svg path {
        fill: #8e8ea9;
      }

      .c33 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        background-color: #4945ff;
        border: 1px solid #4945ff;
        height: 2.5rem;
        padding-left: 16px;
        padding-right: 16px;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
        width: 100%;
      }

      .c33 .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c33 .c5 {
        color: #ffffff;
      }

      .c33[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c33[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c33[aria-disabled='true'] svg > g,
      .c33[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c33[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c33[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c33[aria-disabled='true']:active svg > g,
      .c33[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c33:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c33:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c33 svg > g,
      .c33 svg path {
        fill: #ffffff;
      }

      .c8 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c8 svg {
        height: 4px;
        width: 6px;
      }

      .c25 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c25:focus {
        outline: none;
      }

      .c25[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c24 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
        min-height: 2.5rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c24:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c31 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c31 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c31 svg path {
        fill: #666687;
      }

      .c32 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c32 svg {
        width: 0.375rem;
      }

      .c27 {
        width: 100%;
      }

      .c37 {
        background: transparent;
        border: none;
        position: relative;
        outline: none;
      }

      .c37[aria-disabled='true'] {
        pointer-events: none;
      }

      .c37[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c37 svg {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        font-size: 0.625rem;
      }

      .c37 svg path {
        fill: #4945ff;
      }

      .c37:after {
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

      .c37:focus-visible {
        outline: none;
      }

      .c37:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c10:focus-visible {
        outline: none;
      }

      .c15 {
        height: 4.5rem;
      }

      .c12 {
        margin: 0 auto;
        width: 552px;
      }

      .c18 {
        text-align: center;
      }

      <div>
        <div>
          <header
            class="c0 c1"
          >
            <div
              class="c0 c2"
            >
              <div>
                <button
                  aria-controls="simplemenu-1"
                  aria-disabled="false"
                  aria-expanded="false"
                  aria-haspopup="true"
                  class="c3 c4"
                  label="English"
                  type="button"
                >
                  <span
                    class="c5 c6"
                  >
                    English
                  </span>
                  <div
                    aria-hidden="true"
                    class="c0 c7"
                  >
                    <span
                      class="c8"
                    >
                      <svg
                        aria-hidden="true"
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
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </header>
          <div
            class="c0 c9"
          >
            <main
              aria-labelledby="usecase-title"
              class="c10"
              id="main-content"
              tabindex="-1"
            >
              <div
                class="c0 c11 c12"
              >
                <form>
                  <div
                    class="c0 c13 c14"
                  >
                    <img
                      alt=""
                      aria-hidden="true"
                      class="c15"
                      src="customAuthLogo.png"
                    />
                    <div
                      class="c0 c16"
                      width="15.625rem"
                    >
                      <h1
                        class="c5 c17 c18"
                        id="usecase-title"
                      >
                        Tell us a bit more about yourself
                      </h1>
                    </div>
                  </div>
                  <div
                    class="c0 c19 c20"
                    spacing="6"
                  >
                    <div>
                      <div
                        class="c0 c19 c21"
                        spacing="1"
                      >
                        <span
                          class="c5 c22"
                          for="usecase"
                          id="usecase-label"
                        >
                          <div
                            class="c0 c23"
                          >
                            What type of work do you do?
                          </div>
                        </span>
                        <div
                          class="c0 c23 c24"
                        >
                          <button
                            aria-disabled="false"
                            aria-expanded="false"
                            aria-haspopup="listbox"
                            aria-labelledby="usecase-label usecase-content"
                            class="c25"
                            data-testid="usecase"
                            id="usecase"
                            type="button"
                          />
                          <div
                            class="c0 c26 c27"
                          >
                            <div
                              class="c0 c23"
                            >
                              <div
                                class="c0 c28"
                              >
                                <span
                                  class="c5 c29"
                                  id="usecase-content"
                                >
                                  Select...
                                </span>
                              </div>
                            </div>
                            <div
                              class="c0 c23"
                            >
                              <button
                                aria-hidden="true"
                                class="c0 c30 c31 c32"
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
                    <button
                      aria-disabled="true"
                      class="c3 c33"
                      disabled=""
                      type="submit"
                    >
                      <span
                        class="c5 c34"
                      >
                        Finish
                      </span>
                    </button>
                  </div>
                </form>
              </div>
              <div
                class="c0 c35"
              >
                <div
                  class="c0 c36"
                >
                  <button
                    aria-disabled="false"
                    class="c0 c23 c37"
                    type="button"
                  >
                    <span
                      class="c5 c38"
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
          class="c39"
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
    const { container, queryByTestId } = render(App);

    const selectInput = screen.getByTestId('usecase');

    fireEvent.mouseDown(selectInput);
    await waitFor(() => container.querySelector('[role="listbox"]'));

    fireEvent.click(document.querySelector('[data-strapi-value="front_end_developer"]'));

    expect(queryByTestId('other')).not.toBeInTheDocument();
  });

  it('should show Other input if select value is Other', async () => {
    const { container, queryByTestId } = render(App);

    const selectInput = screen.getByTestId('usecase');

    fireEvent.mouseDown(selectInput);
    await waitFor(() => container.querySelector('[role="listbox"]'));

    fireEvent.click(document.querySelector('[data-strapi-value="other"]'));

    expect(queryByTestId('other')).toBeInTheDocument();
  });
});
