import React from 'react';
import { IntlProvider } from 'react-intl';
import { render as renderTL, fireEvent, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import LogoInput from '../index';

const getFakeSize = jest.fn(() => ({
  width: 500,
  height: 500,
}));

global.Image = class extends Image {
  constructor() {
    super();
    setTimeout(() => {
      const { width, height } = getFakeSize();
      this.width = width;
      this.height = height;
      this.onload();
    }, 100);
  }
};

const render = props =>
  renderTL(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <LogoInput {...props} defaultLogo="/admin/defaultLogo.png" onChangeLogo={() => jest.fn()} />
      </IntlProvider>
    </ThemeProvider>
  );

describe('ApplicationsInfosPage || LogoInput', () => {
  describe('from computer', () => {
    it('should render upload modal with from computer tab', () => {
      render();

      expect(document.body).toMatchInlineSnapshot(`
        .c19 {
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

        .c3 {
          background: #f6f6f9;
          padding: 8px;
          border-radius: 4px;
          border-color: #dcdce4;
          border: 1px solid #dcdce4;
        }

        .c4 {
          position: relative;
        }

        .c6 {
          padding-right: 8px;
          padding-left: 8px;
          width: 100%;
        }

        .c8 {
          height: 124px;
        }

        .c12 {
          position: absolute;
          bottom: 4px;
          width: 100%;
        }

        .c16 {
          padding-top: 8px;
          padding-right: 16px;
          padding-left: 16px;
        }

        .c23 {
          background: #212134;
          padding: 8px;
          border-radius: 4px;
        }

        .c1 {
          font-weight: 600;
          color: #32324d;
          font-size: 0.75rem;
          line-height: 1.33;
        }

        .c17 {
          color: #666687;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.75rem;
          line-height: 1.33;
        }

        .c18 {
          color: #666687;
          font-size: 0.75rem;
          line-height: 1.33;
        }

        .c25 {
          font-weight: 600;
          color: #ffffff;
          font-size: 0.75rem;
          line-height: 1.33;
        }

        .c2 {
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

        .c9 {
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
          z-index: 4;
          display: none;
        }

        .c5 {
          display: grid;
          grid-template-columns: auto 1fr auto;
          grid-template-areas: 'startAction slides endAction';
        }

        .c7 {
          grid-area: slides;
        }

        .c0 {
          display: -webkit-box;
          display: -webkit-flex;
          display: -ms-flexbox;
          display: flex;
          -webkit-flex-direction: column;
          -ms-flex-direction: column;
          flex-direction: column;
        }

        .c0 > * {
          margin-top: 0;
          margin-bottom: 0;
        }

        .c0 > * + * {
          margin-top: 4px;
        }

        .c13 > * {
          margin-left: 0;
          margin-right: 0;
        }

        .c13 > * + * {
          margin-left: 4px;
        }

        .c10 {
          display: -webkit-box;
          display: -webkit-flex;
          display: -ms-flexbox;
          display: flex;
        }

        .c20 {
          background: #212134;
          padding: 8px;
          border-radius: 4px;
        }

        .c22 {
          font-weight: 600;
          color: #ffffff;
          font-size: 0.75rem;
          line-height: 1.33;
        }

        .c21 {
          position: absolute;
          z-index: 4;
          display: none;
        }

        .c14 {
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

        .c14 svg {
          height: 12px;
          width: 12px;
        }

        .c14 svg > g,
        .c14 svg path {
          fill: #ffffff;
        }

        .c14[aria-disabled='true'] {
          pointer-events: none;
        }

        .c14:after {
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

        .c14:focus-visible {
          outline: none;
        }

        .c14:focus-visible:after {
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
          display: -webkit-box;
          display: -webkit-flex;
          display: -ms-flexbox;
          display: flex;
          -webkit-align-items: center;
          -webkit-box-align: center;
          -ms-flex-align: center;
          align-items: center;
          -webkit-box-pack: center;
          -webkit-justify-content: center;
          -ms-flex-pack: center;
          justify-content: center;
          height: 2rem;
          width: 2rem;
        }

        .c15 svg > g,
        .c15 svg path {
          fill: #8e8ea9;
        }

        .c15:hover svg > g,
        .c15:hover svg path {
          fill: #666687;
        }

        .c15:active svg > g,
        .c15:active svg path {
          fill: #a5a5ba;
        }

        .c15[aria-disabled='true'] {
          background-color: #eaeaef;
        }

        .c15[aria-disabled='true'] svg path {
          fill: #666687;
        }

        .c11 {
          max-width: 40%;
          max-height: 40%;
        }

        <body>
          <div>
            <div>
              <div
                class="c0"
                spacing="1"
              >
                <label
                  class="c1"
                  for="carouselinput-1"
                >
                  <div
                    class="c2"
                  >
                    Logo
                  </div>
                </label>
                <div
                  class=""
                  id="carouselinput-1"
                >
                  <div
                    class="c3"
                  >
                    <section
                      aria-label="Logo"
                      aria-roledescription="carousel"
                      class="c4 c5"
                    >
                      <div
                        aria-live="polite"
                        class="c6 c7"
                        width="100%"
                      >
                        <div
                          aria-label="Logo slide"
                          aria-roledescription="slide"
                          class="c8 c9 c10"
                          height="124px"
                          role="group"
                        >
                          <img
                            alt="Logo"
                            class="c11"
                            src="/admin/defaultLogo.png"
                          />
                        </div>
                      </div>
                      <div
                        class="c12 c9 c13"
                        spacing="1"
                        width="100%"
                      >
                        <span>
                          <button
                            aria-disabled="false"
                            aria-labelledby="tooltip-1"
                            class="c14 c15"
                            tabindex="0"
                            type="button"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M24 13.604a.3.3 0 01-.3.3h-9.795V23.7a.3.3 0 01-.3.3h-3.21a.3.3 0 01-.3-.3v-9.795H.3a.3.3 0 01-.3-.3v-3.21a.3.3 0 01.3-.3h9.795V.3a.3.3 0 01.3-.3h3.21a.3.3 0 01.3.3v9.795H23.7a.3.3 0 01.3.3v3.21z"
                                fill="#212134"
                              />
                            </svg>
                          </button>
                        </span>
                      </div>
                    </section>
                    <div
                      class="c16"
                    >
                      <span>
                        <div
                          aria-labelledby="tooltip-2"
                          class="c9"
                          tabindex="0"
                        >
                          <span
                            class="c17"
                          >
                            logo.png
                          </span>
                        </div>
                      </span>
                    </div>
                  </div>
                </div>
                <p
                  class="c18"
                  id="carouselinput-1-hint"
                >
                  Change the admin panel logo (Max dimension: 750*750, Max file size: 100KB)
                </p>
              </div>
            </div>
            <div
              class="c19"
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
          <div
            data-react-portal="true"
          >
            <div
              class="c20 c21"
              id="tooltip-1"
              role="tooltip"
            >
              <p
                class="c22"
              >
                Change logo
              </p>
            </div>
          </div>
          <div
            data-react-portal="true"
          >
            <div
              class="c23 c24"
              id="tooltip-2"
              role="tooltip"
            >
              <p
                class="c25"
              >
                logo.png
              </p>
            </div>
          </div>
        </body>
      `);
    });

    it('should show error message when uploading wrong file format', async () => {
      render();
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      await waitFor(() => expect(screen.getByText('Upload logo')).toBeInTheDocument());

      const file = new File(['(⌐□_□)'], 'michka.gif', { type: 'image/gif' });
      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() =>
        expect(
          screen.getByText('Wrong format uploaded (accepted formats only: jpeg, jpg, png, svg).')
        ).toBeInTheDocument()
      );
    });

    it('should show error message when uploading unauthorized width/height', async () => {
      getFakeSize.mockImplementationOnce(() => ({
        width: 5000,
        height: 5000,
      }));

      render({ initialStep: 'upload' });
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      await waitFor(() => expect(screen.getByText('Upload logo')).toBeInTheDocument());

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });
      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() =>
        expect(
          screen.getByText(
            'The file uploaded is too large (max dimension: 750*750, max file size: 100KB)'
          )
        ).toBeInTheDocument()
      );
    });

    it('should show error message when uploading unauthorized file size', async () => {
      render({ initialStep: 'upload' });
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      await waitFor(() => expect(screen.getByText('Upload logo')).toBeInTheDocument());

      const file = new File([new Blob(['1'.repeat(1024 * 1024 + 1)])], 'michka.png', {
        type: 'image/png',
      });

      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() =>
        expect(
          screen.getByText(
            'The file uploaded is too large (max dimension: 750*750, max file size: 100KB)'
          )
        ).toBeInTheDocument()
      );
    });

    it('should accept upload and lead user to next modal', async () => {
      render({ initialStep: 'upload' });
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      await waitFor(() => expect(screen.getByText('Upload logo')).toBeInTheDocument());

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });

      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() => expect(screen.getByText('Pending logo')).toBeInTheDocument());
    });

    it('should let user choose another logo', async () => {
      render({ initialStep: 'upload' });
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      await waitFor(() => expect(screen.getByText('Upload logo')).toBeInTheDocument());

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });

      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() => expect(screen.getByText('Pending logo')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Choose another logo'));

      await waitFor(() => expect(screen.getByText('Upload logo')).toBeInTheDocument());
    });
  });
});
