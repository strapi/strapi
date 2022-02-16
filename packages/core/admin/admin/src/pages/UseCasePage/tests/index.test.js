import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import UseCasePage from '../index';

jest.mock('../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale: () => {},
  localeNames: ['en'],
  messages: ['test'],
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
      .c41 {
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

      .c1 {
        padding-top: 24px;
        padding-right: 40px;
      }

      .c9 {
        padding-top: 64px;
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

      .c16 {
        padding-top: 24px;
        padding-bottom: 4px;
        width: 15.625rem;
      }

      .c37 {
        padding-top: 16px;
      }

      .c35 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c32 {
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

      .c32 svg {
        height: 12px;
        width: 12px;
      }

      .c32 svg > g,
      .c32 svg path {
        fill: #ffffff;
      }

      .c32[aria-disabled='true'] {
        pointer-events: none;
      }

      .c32:after {
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

      .c32:focus-visible {
        outline: none;
      }

      .c32:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c33 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 10px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
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

      .c33 .sc-cvlWTT {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c33 .c34 {
        color: #ffffff;
      }

      .c33[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c33[aria-disabled='true'] .c34 {
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

      .c33[aria-disabled='true']:active .c34 {
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

      .c13 {
        padding-bottom: 32px;
      }

      .c0 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c14 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c36 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c24 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c24:focus {
        outline: none;
      }

      .c24[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c21 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c28 {
        color: #666687;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c27 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c29 {
        padding-left: 12px;
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

      .c25 {
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

      .c20 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c20 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c20 > * + * {
        margin-top: 4px;
      }

      .c23 {
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

      .c23:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c30 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c30 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c30 svg path {
        fill: #666687;
      }

      .c31 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c31 svg {
        width: 0.375rem;
      }

      .c26 {
        width: 100%;
      }

      .c19 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c19 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c19 > * + * {
        margin-top: 24px;
      }

      .c17 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c10:focus-visible {
        outline: none;
      }

      .c40 {
        color: #4945ff;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c38 {
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

      .c39 {
        background: transparent;
        border: none;
        position: relative;
        outline: none;
      }

      .c39[aria-disabled='true'] {
        pointer-events: none;
      }

      .c39[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c39 svg {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        font-size: 0.625rem;
      }

      .c39 svg path {
        fill: #4945ff;
      }

      .c39:after {
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

      .c39:focus-visible {
        outline: none;
      }

      .c39:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c15 {
        height: 4.5rem;
      }

      .c5 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c7 {
        padding-left: 8px;
      }

      .c2 {
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

      .c2 svg {
        height: 12px;
        width: 12px;
      }

      .c2 svg > g,
      .c2 svg path {
        fill: #ffffff;
      }

      .c2[aria-disabled='true'] {
        pointer-events: none;
      }

      .c2:after {
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

      .c2:focus-visible {
        outline: none;
      }

      .c2:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c3 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid transparent;
        background: transparent;
      }

      .c3 .c6 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c3 .c4 {
        color: #ffffff;
      }

      .c3[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c3[aria-disabled='true'] .c4 {
        color: #666687;
      }

      .c3[aria-disabled='true'] svg > g,
      .c3[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c3[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c3[aria-disabled='true']:active .c4 {
        color: #666687;
      }

      .c3[aria-disabled='true']:active svg > g,
      .c3[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c3:hover {
        background-color: #f6f6f9;
      }

      .c3:active {
        border: 1px solid undefined;
        background: undefined;
      }

      .c3 .c4 {
        color: #32324d;
      }

      .c3 svg > g,
      .c3 svg path {
        fill: #8e8ea9;
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
            class="c0"
          >
            <div
              class="c1"
            >
              <div>
                <button
                  aria-controls="simplemenu-1"
                  aria-disabled="false"
                  aria-expanded="false"
                  aria-haspopup="true"
                  class="c2 c3"
                  type="button"
                >
                  <span
                    class="c4 c5"
                  />
                  <div
                    aria-hidden="true"
                    class="c6 c7"
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
            class="c9"
          >
            <main
              aria-labelledby="usecase-title"
              class="c10"
              id="main-content"
              tabindex="-1"
            >
              <div
                class="c11 c12"
              >
                <form>
                  <div
                    class="c13 c14"
                  >
                    <img
                      alt=""
                      aria-hidden="true"
                      class="c15"
                    />
                    <div
                      class="c16"
                      width="15.625rem"
                    >
                      <h1
                        class="c17 c18"
                        id="usecase-title"
                      >
                        Tell us a bit more about yourself
                      </h1>
                    </div>
                  </div>
                  <div
                    class="c19"
                  >
                    <div>
                      <div
                        class="c20"
                      >
                        <span
                          class="c21"
                          for="usecase"
                          id="usecase-label"
                        >
                          What type of work do you do?
                        </span>
                        <div
                          class="c22 c23"
                        >
                          <button
                            aria-disabled="false"
                            aria-expanded="false"
                            aria-haspopup="listbox"
                            aria-labelledby="usecase-label usecase-content"
                            class="c24"
                            data-testid="usecase"
                            id="usecase"
                            type="button"
                          />
                          <div
                            class="c25 c26"
                          >
                            <div
                              class="c22"
                            >
                              <div
                                class="c27"
                              >
                                <span
                                  class="c28"
                                  id="usecase-content"
                                >
                                  Select...
                                </span>
                              </div>
                            </div>
                            <div
                              class="c22"
                            >
                              <button
                                aria-hidden="true"
                                class="c29 c30 c31"
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
                      class="c32 c33"
                      disabled=""
                      type="submit"
                    >
                      <span
                        class="c34 c35"
                      >
                        Finish
                      </span>
                    </button>
                  </div>
                </form>
              </div>
              <div
                class="c36"
              >
                <div
                  class="c37"
                >
                  <button
                    aria-disabled="false"
                    class="c38 c39"
                    type="button"
                  >
                    <span
                      class="c40"
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
          class="c41"
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
