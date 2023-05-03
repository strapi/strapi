import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

      .c24 {
        background: #ffffff;
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        cursor: default;
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

      .c38 {
        background: transparent;
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

      .c40 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4945ff;
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
        gap: 16px;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c27 {
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
      }

      .c30 {
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

      .c39 {
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

      .c4 {
        position: relative;
        outline: none;
      }

      .c4 > svg {
        height: 12px;
        width: 12px;
      }

      .c4 > svg > g,
      .c4 > svg path {
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
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
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

      .c26 {
        border: 1px solid #dcdce4;
        min-height: 2.5rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c26[aria-disabled='true'] {
        color: #666687;
      }

      .c26:focus-visible {
        outline: none;
      }

      .c26:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c31 > svg {
        width: 0.375rem;
      }

      .c31 > svg > path {
        fill: #666687;
      }

      .c29 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        gap: 4px;
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
      }

      .c42[data-state='checked'] .c6 {
        font-weight: bold;
        color: #4945ff;
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
                          class="c6 c22 c23"
                          for="usecase"
                        >
                          What type of work do you do?
                        </label>
                        <div
                          aria-autocomplete="none"
                          aria-controls="radix-0"
                          aria-describedby="usecase-hint usecase-error"
                          aria-expanded="false"
                          aria-label="What type of work do you do?"
                          class="c24 c25 c26"
                          data-state="closed"
                          dir="ltr"
                          id="usecase"
                          overflow="hidden"
                          role="combobox"
                          tabindex="0"
                        >
                          <span
                            class="c27"
                          >
                            <span
                              class="c6 c28"
                            >
                              <span
                                class="c29"
                              />
                            </span>
                          </span>
                          <span
                            class="c30"
                          >
                            <span
                              aria-hidden="true"
                              class="c31"
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
                    class="c38 c3 c39"
                    type="button"
                  >
                    <span
                      class="c6 c40"
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
