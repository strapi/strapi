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

      .c28 {
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
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c9 {
        padding-right: 8px;
      }

      .c13 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c15 {
        padding-bottom: 56px;
      }

      .c19 {
        background: #ffffff;
        padding: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c29 {
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

      .c31 {
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
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

      .c6 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c11 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 1.14;
        color: #32324d;
      }

      .c12 {
        font-size: 1rem;
        line-height: 1.5;
        color: #666687;
      }

      .c21 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c26 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c34 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #666687;
        text-transform: uppercase;
      }

      .c36 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #4945ff;
        text-transform: uppercase;
      }

      .c38 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c39 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #b72b1a;
        text-transform: uppercase;
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

      .c25 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c25 > * + * {
        margin-top: 4px;
      }

      .c7 {
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

      .c7 svg {
        height: 12px;
        width: 12px;
      }

      .c7 svg > g,
      .c7 svg path {
        fill: #ffffff;
      }

      .c7[aria-disabled='true'] {
        pointer-events: none;
      }

      .c7:after {
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

      .c7:focus-visible {
        outline: none;
      }

      .c7:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c10 {
        height: 100%;
      }

      .c8 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        background-color: #4945ff;
        border: 1px solid #4945ff;
        height: 2rem;
        padding-left: 16px;
        padding-right: 16px;
      }

      .c8 .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c8 .c5 {
        color: #ffffff;
      }

      .c8[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c8[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c8[aria-disabled='true'] svg > g,
      .c8[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c8[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c8[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c8[aria-disabled='true']:active svg > g,
      .c8[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c8:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c8:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c8 svg > g,
      .c8 svg path {
        fill: #ffffff;
      }

      .c27 {
        position: relative;
        display: inline-block;
        z-index: 0;
        width: 100%;
      }

      .c30 {
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

      .c30:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c33 {
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

      .c35 {
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

      .c37 {
        height: 100%;
        left: 0;
        opacity: 0;
        position: absolute;
        top: 0;
        z-index: 1;
        width: 100%;
      }

      .c24 {
        max-width: 320px;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c22 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 24px;
      }

      .c23 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c14 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c16 {
        overflow-x: hidden;
      }

      @media (max-width:68.75rem) {
        .c23 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c23 {
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
                class="c1 c2"
                data-strapi-header="true"
              >
                <div
                  class="c1 c3"
                >
                  <div
                    class="c1 c4"
                  >
                    <h1
                      class="c5 c6"
                    >
                      Media Library
                    </h1>
                  </div>
                  <button
                    aria-disabled="true"
                    class="c7 c8"
                    data-testid="save-button"
                    disabled=""
                    type="submit"
                  >
                    <div
                      aria-hidden="true"
                      class="c1 c9 c10"
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
                      class="c5 c11"
                    >
                      Save
                    </span>
                  </button>
                </div>
                <p
                  class="c5 c12"
                >
                  Configure the settings for the Media Library
                </p>
              </div>
            </div>
            <div
              class="c1 c13"
            >
              <div
                class="c1 c14"
              >
                <div
                  class="c1 c15 c16"
                >
                  <div
                    class="c1 c17 c18"
                    spacing="12"
                  >
                    <div
                      class="c1 c19"
                    >
                      <div
                        class="c1 c17 c20"
                        spacing="4"
                      >
                        <div
                          class="c1 c4"
                        >
                          <h2
                            class="c5 c21"
                          >
                            Asset management
                          </h2>
                        </div>
                        <div
                          class="c1 c22"
                        >
                          <div
                            class="c23"
                          >
                            <div
                              class="c1 "
                            >
                              <div
                                class="c24"
                              >
                                <div
                                  class="c1 c17 c25"
                                  spacing="1"
                                >
                                  <div
                                    class="c1 c4"
                                  >
                                    <label
                                      class="c5 c26"
                                      for="toggleinput-1"
                                    >
                                      <div
                                        class="c1 c4"
                                      >
                                        Responsive friendly upload
                                      </div>
                                    </label>
                                  </div>
                                  <label
                                    class="c27"
                                  >
                                    <div
                                      class="c28"
                                    >
                                      Responsive friendly upload
                                    </div>
                                    <div
                                      class="c1 c29 c30"
                                      display="flex"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c1 c31 c32 c33"
                                      >
                                        <span
                                          class="c5 c34"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c1 c31 c32 c35"
                                      >
                                        <span
                                          class="c5 c36"
                                        >
                                          On
                                        </span>
                                      </div>
                                      <input
                                        aria-disabled="false"
                                        aria-label="responsiveDimensions"
                                        checked=""
                                        class="c37"
                                        data-testid="responsiveDimensions"
                                        id="toggleinput-1"
                                        name="responsiveDimensions"
                                        type="checkbox"
                                      />
                                    </div>
                                  </label>
                                  <p
                                    class="c5 c38"
                                    id="toggleinput-1-hint"
                                  >
                                    Enabling this option will generate multiple formats (small, medium and large) of the uploaded asset.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div
                            class="c23"
                          >
                            <div
                              class="c1 "
                            >
                              <div
                                class="c24"
                              >
                                <div
                                  class="c1 c17 c25"
                                  spacing="1"
                                >
                                  <div
                                    class="c1 c4"
                                  >
                                    <label
                                      class="c5 c26"
                                      for="toggleinput-2"
                                    >
                                      <div
                                        class="c1 c4"
                                      >
                                        Size optimization
                                      </div>
                                    </label>
                                  </div>
                                  <label
                                    class="c27"
                                  >
                                    <div
                                      class="c28"
                                    >
                                      Size optimization
                                    </div>
                                    <div
                                      class="c1 c29 c30"
                                      display="flex"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c1 c31 c32 c35"
                                      >
                                        <span
                                          class="c5 c39"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c1 c31 c32 c33"
                                      >
                                        <span
                                          class="c5 c34"
                                        >
                                          On
                                        </span>
                                      </div>
                                      <input
                                        aria-disabled="false"
                                        aria-label="sizeOptimization"
                                        class="c37"
                                        data-testid="sizeOptimization"
                                        id="toggleinput-2"
                                        name="sizeOptimization"
                                        type="checkbox"
                                      />
                                    </div>
                                  </label>
                                  <p
                                    class="c5 c38"
                                    id="toggleinput-2-hint"
                                  >
                                    Enabling this option will reduce the image size and slightly reduce its quality.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div
                            class="c23"
                          >
                            <div
                              class="c1 "
                            >
                              <div
                                class="c24"
                              >
                                <div
                                  class="c1 c17 c25"
                                  spacing="1"
                                >
                                  <div
                                    class="c1 c4"
                                  >
                                    <label
                                      class="c5 c26"
                                      for="toggleinput-3"
                                    >
                                      <div
                                        class="c1 c4"
                                      >
                                        Auto orientation
                                      </div>
                                    </label>
                                  </div>
                                  <label
                                    class="c27"
                                  >
                                    <div
                                      class="c28"
                                    >
                                      Auto orientation
                                    </div>
                                    <div
                                      class="c1 c29 c30"
                                      display="flex"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c1 c31 c32 c33"
                                      >
                                        <span
                                          class="c5 c34"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c1 c31 c32 c35"
                                      >
                                        <span
                                          class="c5 c36"
                                        >
                                          On
                                        </span>
                                      </div>
                                      <input
                                        aria-disabled="false"
                                        aria-label="autoOrientation"
                                        checked=""
                                        class="c37"
                                        data-testid="autoOrientation"
                                        id="toggleinput-3"
                                        name="autoOrientation"
                                        type="checkbox"
                                      />
                                    </div>
                                  </label>
                                  <p
                                    class="c5 c38"
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
