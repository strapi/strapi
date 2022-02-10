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

      .c18 {
        background: #ffffff;
        padding: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c11 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
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
        padding: 10px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
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

      .c20 {
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

      .c17 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c17 > * {
        margin-top: 0;
        margin-bottom: 0;
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
        margin-top: 16px;
      }

      .c27 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c36 {
        font-weight: 600;
        color: #271fe0;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c38 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c40 {
        font-weight: 600;
        color: #b72b1a;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c30 {
        background: #ffffff;
        border-radius: 4px;
      }

      .c32 {
        background: #ffffff;
        padding-right: 32px;
        padding-left: 32px;
      }

      .c34 {
        background: #f0f0ff;
        padding-right: 32px;
        padding-left: 32px;
      }

      .c39 {
        background: #fcecea;
        padding-right: 32px;
        padding-left: 32px;
      }

      .c26 {
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
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c25 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c25 > * + * {
        margin-top: 4px;
      }

      .c29 {
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
        position: relative;
        display: inline-block;
      }

      .c31 {
        height: 2.5rem;
        border: 1px solid #dcdce4;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        overflow: hidden;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c31:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c35 {
        text-transform: uppercase;
        position: relative;
        z-index: 2;
      }

      .c33 {
        text-transform: uppercase;
        border-right: 1px solid #dcdce4;
        position: relative;
        z-index: 2;
      }

      .c37 {
        position: absolute;
        z-index: 1;
        left: 4px;
        top: 4px;
      }

      .c24 {
        width: -webkit-fit-content;
        width: -moz-fit-content;
        width: fit-content;
      }

      .c21 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
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

      .c3 {
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
                    class="c17"
                  >
                    <div
                      class="c18"
                    >
                      <div
                        class="c19"
                      >
                        <div
                          class="c20"
                        >
                          <h2
                            class="c21"
                          >
                            Asset management
                          </h2>
                        </div>
                        <div
                          class="c22"
                        >
                          <div
                            class="c23"
                          >
                            <div
                              class=""
                            >
                              <div
                                class="c24"
                              >
                                <div
                                  class="c25"
                                >
                                  <div
                                    class="c26"
                                  >
                                    <label
                                      class="c27"
                                      for="toggleinput-1"
                                    >
                                      Responsive friendly upload
                                    </label>
                                  </div>
                                  <label
                                    class="c28"
                                  >
                                    <div
                                      class="c29"
                                    >
                                      Responsive friendly upload
                                    </div>
                                    <div
                                      class="c30 c31"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c32 c26 c33"
                                      >
                                        <span
                                          class="c27"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c34 c26 c35"
                                      >
                                        <span
                                          class="c36"
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
                                    class="c38"
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
                              class=""
                            >
                              <div
                                class="c24"
                              >
                                <div
                                  class="c25"
                                >
                                  <div
                                    class="c26"
                                  >
                                    <label
                                      class="c27"
                                      for="toggleinput-2"
                                    >
                                      Size optimization
                                    </label>
                                  </div>
                                  <label
                                    class="c28"
                                  >
                                    <div
                                      class="c29"
                                    >
                                      Size optimization
                                    </div>
                                    <div
                                      class="c30 c31"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c39 c26 c33"
                                      >
                                        <span
                                          class="c40"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c32 c26 c35"
                                      >
                                        <span
                                          class="c27"
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
                                    class="c38"
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
                              class=""
                            >
                              <div
                                class="c24"
                              >
                                <div
                                  class="c25"
                                >
                                  <div
                                    class="c26"
                                  >
                                    <label
                                      class="c27"
                                      for="toggleinput-3"
                                    >
                                      Auto orientation
                                    </label>
                                  </div>
                                  <label
                                    class="c28"
                                  >
                                    <div
                                      class="c29"
                                    >
                                      Auto orientation
                                    </div>
                                    <div
                                      class="c30 c31"
                                    >
                                      <div
                                        aria-hidden="true"
                                        class="c32 c26 c33"
                                      >
                                        <span
                                          class="c27"
                                        >
                                          Off
                                        </span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        class="c34 c26 c35"
                                      >
                                        <span
                                          class="c36"
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
                                    class="c38"
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
