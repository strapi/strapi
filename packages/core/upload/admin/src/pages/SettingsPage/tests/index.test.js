/**
 *
 * Tests for SettingsPage
 *
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { SettingsPage } from '../index';
import server from './utils/server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useOverlayBlocker: () => ({ lockApp: jest.fn(), unlockApp: jest.fn() }),
  useFocusWhenNavigate: jest.fn(),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <SettingsPage />
    </IntlProvider>
  </ThemeProvider>
);

describe('Upload | SettingsPage', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the snapshot', async () => {
    const { container, getByText } = render(App);

    await waitFor(() =>
      expect(
        getByText(
          'Enabling this option will automatically rotate the image according to EXIF orientation tag.'
        )
      ).toBeInTheDocument()
    );

    expect(container).toMatchInlineSnapshot(`
      .c43 {
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

      .c21 {
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

      .c17 {
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

      .c18 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c20 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c20 > * + * {
        margin-top: 16px;
      }

      .c22 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c11 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c8 {
        padding-right: 8px;
      }

      .c5 {
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

      .c5 svg {
        height: 12px;
        width: 12px;
      }

      .c5 svg > g,
      .c5 svg path {
        fill: #ffffff;
      }

      .c5[aria-disabled='true'] {
        pointer-events: none;
      }

      .c5:after {
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

      .c5:focus-visible {
        outline: none;
      }

      .c5:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c9 {
        height: 100%;
      }

      .c6 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
      }

      .c6 .c7 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c6 .c10 {
        color: #ffffff;
      }

      .c6[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c6[aria-disabled='true'] .c10 {
        color: #666687;
      }

      .c6[aria-disabled='true'] svg > g,
      .c6[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c6[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c6[aria-disabled='true']:active .c10 {
        color: #666687;
      }

      .c6[aria-disabled='true']:active svg > g,
      .c6[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c6:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c6:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c6 svg > g,
      .c6 svg path {
        fill: #ffffff;
      }

      .c19 {
        background: #ffffff;
        padding: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c32 {
        background: #f6f6f9;
        padding: 4px;
        border-radius: 4px;
        border-style: solid;
        border-width: 1px;
        border-color: #dcdce4;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

      .c34 {
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
      }

      .c26 {
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

      .c28 {
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

      .c29 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c37 {
        font-weight: 600;
        color: #666687;
        text-transform: uppercase;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c39 {
        font-weight: 600;
        color: #4945ff;
        text-transform: uppercase;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c41 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c42 {
        font-weight: 600;
        color: #b72b1a;
        text-transform: uppercase;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c27 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c27 > * + * {
        margin-top: 4px;
      }

      .c31 {
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

      .c30 {
        position: relative;
        display: inline-block;
        z-index: 0;
        width: 100%;
      }

      .c33 {
        overflow: hidden;
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c33:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c36 {
        background-color: transparent;
        border: 1px solid #f6f6f9;
        position: relative;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        z-index: 2;
        -webkit-flex: 1 1 50%;
        -ms-flex: 1 1 50%;
        flex: 1 1 50%;
        padding-top: 6px;
        padding-bottom: 6px;
      }

      .c38 {
        background-color: #ffffff;
        border: 1px solid #dcdce4;
        position: relative;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        z-index: 2;
        -webkit-flex: 1 1 50%;
        -ms-flex: 1 1 50%;
        flex: 1 1 50%;
        padding-top: 6px;
        padding-bottom: 6px;
      }

      .c40 {
        height: 100%;
        left: 0;
        opacity: 0;
        position: absolute;
        top: 0;
        z-index: 1;
        width: 100%;
      }

      .c25 {
        max-width: 320px;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c23 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 24px;
      }

      .c24 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c13 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c15 {
        padding-bottom: 56px;
      }

      .c14 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c16 {
        overflow-x: hidden;
      }

      .c2 {
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

      .c4 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c12 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      @media (max-width:68.75rem) {
        .c24 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c24 {
          grid-column: span;
        }
      }

      <div>
        <main
          aria-labelledby="main-content-title"
          class="c0"
          id="main-content"
          tabindex="-1"
        >
          <form>
            <div
              style="height: 0px;"
            >
              <div
                class="c1"
                data-strapi-header="true"
              >
                <div
                  class="c2"
                >
                  <div
                    class="c3"
                  >
                    <h1
                      class="c4"
                    >
                      Media Library
                    </h1>
                  </div>
                  <button
                    aria-disabled="true"
                    class="c5 c6"
                    data-testid="save-button"
                    disabled=""
                    type="submit"
                  >
                    <div
                      aria-hidden="true"
                      class="c7 c8 c9"
                    >
                      <svg
                        fill="none"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                          fill="#212134"
                        />
                      </svg>
                    </div>
                    <span
                      class="c10 c11"
                    >
                      Save
                    </span>
                  </button>
                </div>
                <p
                  class="c12"
                >
                  Configure the settings for the Media Library
                </p>
              </div>
            </div>
            <div
              class="c13"
            >
              <div
                class="c14"
              >
                <div
                  class="c15 c16"
                >
                  <div
                    class="c17 c18"
                    spacing="12"
                  >
                    <div
                      class="c19"
                    >
                      <div
                        class="c17 c20"
                        spacing="4"
                      >
                        <div
                          class="c21"
                        >
                          <h2
                            class="c22"
                          >
                            Asset management
                          </h2>
                        </div>
                        <div
                          class="c23"
                        >
                          <div
                            class="c24"
                          >
                            <div
                              class=""
                            >
                              <div
                                class="c25"
                              >
                                <div
                                  class="c26 c27"
                                  spacing="1"
                                >
                                  <div
                                    class="c28"
                                  >
                                    <label
                                      class="c29"
                                      for="toggleinput-1"
                                    >
                                      <div
                                        class="c28"
                                      >
                                        Responsive friendly upload
                                      </div>
                                    </label>
                                  </div>
                                  <label
                                    class="c30"
                                  >
                                    <div
                                      class="c31"
                                    >
                                      Responsive friendly upload
                                    </div>
                                    <div
                                      class="c32 c33"
                                      display="flex"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c34 c35 c36"
                                      >
                                        <span
                                          class="c37"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c34 c35 c38"
                                      >
                                        <span
                                          class="c39"
                                        >
                                          On
                                        </span>
                                      </div>
                                      <input
                                        aria-disabled="false"
                                        aria-label="responsiveDimensions"
                                        checked=""
                                        class="c40"
                                        data-testid="responsiveDimensions"
                                        id="toggleinput-1"
                                        name="responsiveDimensions"
                                        type="checkbox"
                                      />
                                    </div>
                                  </label>
                                  <p
                                    class="c41"
                                    id="toggleinput-1-hint"
                                  >
                                    Enabling this option will generate multiple formats (small, medium and large) of the uploaded asset.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div
                            class="c24"
                          >
                            <div
                              class=""
                            >
                              <div
                                class="c25"
                              >
                                <div
                                  class="c26 c27"
                                  spacing="1"
                                >
                                  <div
                                    class="c28"
                                  >
                                    <label
                                      class="c29"
                                      for="toggleinput-2"
                                    >
                                      <div
                                        class="c28"
                                      >
                                        Size optimization
                                      </div>
                                    </label>
                                  </div>
                                  <label
                                    class="c30"
                                  >
                                    <div
                                      class="c31"
                                    >
                                      Size optimization
                                    </div>
                                    <div
                                      class="c32 c33"
                                      display="flex"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c34 c35 c38"
                                      >
                                        <span
                                          class="c42"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c34 c35 c36"
                                      >
                                        <span
                                          class="c37"
                                        >
                                          On
                                        </span>
                                      </div>
                                      <input
                                        aria-disabled="false"
                                        aria-label="sizeOptimization"
                                        class="c40"
                                        data-testid="sizeOptimization"
                                        id="toggleinput-2"
                                        name="sizeOptimization"
                                        type="checkbox"
                                      />
                                    </div>
                                  </label>
                                  <p
                                    class="c41"
                                    id="toggleinput-2-hint"
                                  >
                                    Enabling this option will reduce the image size and slightly reduce its quality.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div
                            class="c24"
                          >
                            <div
                              class=""
                            >
                              <div
                                class="c25"
                              >
                                <div
                                  class="c26 c27"
                                  spacing="1"
                                >
                                  <div
                                    class="c28"
                                  >
                                    <label
                                      class="c29"
                                      for="toggleinput-3"
                                    >
                                      <div
                                        class="c28"
                                      >
                                        Auto orientation
                                      </div>
                                    </label>
                                  </div>
                                  <label
                                    class="c30"
                                  >
                                    <div
                                      class="c31"
                                    >
                                      Auto orientation
                                    </div>
                                    <div
                                      class="c32 c33"
                                      display="flex"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c34 c35 c36"
                                      >
                                        <span
                                          class="c37"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c34 c35 c38"
                                      >
                                        <span
                                          class="c39"
                                        >
                                          On
                                        </span>
                                      </div>
                                      <input
                                        aria-disabled="false"
                                        aria-label="autoOrientation"
                                        checked=""
                                        class="c40"
                                        data-testid="autoOrientation"
                                        id="toggleinput-3"
                                        name="autoOrientation"
                                        type="checkbox"
                                      />
                                    </div>
                                  </label>
                                  <p
                                    class="c41"
                                    id="toggleinput-3-hint"
                                  >
                                    Enabling this option will automatically rotate the image according to EXIF orientation tag.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </main>
        <div
          class="c43"
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

  it('should display the form correctly with the initial values', async () => {
    const { getByTestId } = render(App);

    await waitFor(() => {
      const responsiveDimension = getByTestId('responsiveDimensions');
      const sizeOptimization = getByTestId('sizeOptimization');
      const autoOrientation = getByTestId('autoOrientation');
      const saveButton = getByTestId('save-button');

      expect(responsiveDimension.checked).toBe(true);
      expect(autoOrientation.checked).toBe(true);
      expect(sizeOptimization.checked).toBe(false);
      expect(saveButton).toBeDisabled();
    });
  });
});
