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
      .c1 {
        padding-top: 24px;
        padding-right: 40px;
      }

      .c2 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        cursor: pointer;
      }

      .c10 {
        padding-top: 8px;
        padding-bottom: 64px;
      }

      .c12 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c14 {
        padding-bottom: 32px;
      }

      .c17 {
        padding-top: 24px;
        padding-bottom: 4px;
        width: 15.625rem;
      }

      .c27 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c29 {
        padding-left: 12px;
      }

      .c32 {
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

      .c37 {
        padding-top: 16px;
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
        gap: 8px;
      }

      .c8 {
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

      .c15 {
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

      .c20 {
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

      .c21 {
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

      .c25 {
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

      .c33 {
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

      .c36 {
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

      .c7 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #ffffff;
      }

      .c18 {
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

      .c28 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #666687;
      }

      .c35 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 600;
        color: #ffffff;
      }

      .c39 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4945ff;
      }

      .c38 {
        background: transparent;
        border: none;
        position: relative;
        outline: none;
      }

      .c38[aria-disabled='true'] {
        pointer-events: none;
      }

      .c38[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c38 svg {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        font-size: 0.625rem;
      }

      .c38 svg path {
        fill: #4945ff;
      }

      .c38:after {
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

      .c38:focus-visible {
        outline: none;
      }

      .c38:focus-visible:after {
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
        position: relative;
        outline: none;
      }

      .c4 svg {
        height: 12px;
        width: 12px;
      }

      .c4 svg > g,
      .c4 svg path {
        fill: #ffffff;
      }

      .c4[aria-disabled='true'] {
        pointer-events: none;
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

      .c40 {
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

      .c5 {
        height: 2rem;
        border: 1px solid transparent;
        background: transparent;
      }

      .c5[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c5[aria-disabled='true'] .c6 {
        color: #666687;
      }

      .c5[aria-disabled='true'] svg > g,.c5[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c5[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c5[aria-disabled='true']:active .c6 {
        color: #666687;
      }

      .c5[aria-disabled='true']:active svg > g,.c5[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c5:hover {
        background-color: #f6f6f9;
      }

      .c5:active {
        border: 1px solid undefined;
        background: undefined;
      }

      .c5 .c6 {
        color: #32324d;
      }

      .c5 svg > g,
      .c5 svg path {
        fill: #8e8ea9;
      }

      .c34 {
        height: 2.5rem;
      }

      .c34[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c34[aria-disabled='true'] .c6 {
        color: #666687;
      }

      .c34[aria-disabled='true'] svg > g,.c34[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c34[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c34[aria-disabled='true']:active .c6 {
        color: #666687;
      }

      .c34[aria-disabled='true']:active svg > g,.c34[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c34:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c34:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c34 svg > g,
      .c34 svg path {
        fill: #ffffff;
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

      .c9 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c9 svg {
        height: 4px;
        width: 6px;
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

      .c26 {
        width: 100%;
      }

      .c11:focus-visible {
        outline: none;
      }

      .c16 {
        height: 4.5rem;
      }

      .c13 {
        margin: 0 auto;
        width: 552px;
      }

      .c19 {
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
                  aria-controls="0"
                  aria-disabled="false"
                  aria-expanded="false"
                  aria-haspopup="true"
                  class="c2 c3 c4 c5"
                  label="English"
                  type="button"
                >
                  <span
                    class="c6 c7"
                  >
                    English
                  </span>
                  <div
                    aria-hidden="true"
                    class="c8"
                  >
                    <span
                      class="c9"
                    >
                      <svg
                        aria-hidden="true"
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
                  </div>
                </button>
              </div>
            </div>
          </header>
          <div
            class="c10"
          >
            <main
              aria-labelledby="usecase-title"
              class="c11"
              id="main-content"
              tabindex="-1"
            >
              <div
                class="c12 c13"
              >
                <form>
                  <div
                    class="c14 c15"
                  >
                    <img
                      alt=""
                      aria-hidden="true"
                      class="c16"
                      src="customAuthLogo.png"
                    />
                    <div
                      class="c17"
                    >
                      <h1
                        class="c6 c18 c19"
                        id="usecase-title"
                      >
                        Tell us a bit more about yourself
                      </h1>
                    </div>
                  </div>
                  <div
                    class="c20"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c21"
                      >
                        <label
                          class="c6 c22"
                          for="usecase"
                        >
                          <div
                            class="c8"
                          >
                            What type of work do you do?
                          </div>
                        </label>
                        <div
                          class="c8 c23"
                        >
                          <button
                            aria-disabled="false"
                            aria-expanded="false"
                            aria-haspopup="listbox"
                            aria-labelledby="usecase usecase-label usecase-content"
                            class="c24"
                            data-testid="usecase"
                            id="usecase"
                            type="button"
                          />
                          <div
                            class="c25 c26"
                          >
                            <div
                              class="c8"
                            >
                              <div
                                class="c27"
                              >
                                <span
                                  class="c6 c28"
                                  id="usecase-content"
                                >
                                  Select...
                                </span>
                              </div>
                            </div>
                            <div
                              class="c8"
                            >
                              <button
                                aria-hidden="true"
                                class="c29 c30 c31"
                                tabindex="-1"
                                title="Carret Down Button"
                                type="button"
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
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      aria-disabled="true"
                      class="c32 c33 c4 c34"
                      disabled=""
                      type="submit"
                    >
                      <span
                        class="c6 c35"
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
                    class="c8 c38"
                    type="button"
                  >
                    <span
                      class="c6 c39"
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
          class="c40"
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
