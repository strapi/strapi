import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { useForm } from '../../../hooks';
import ProvidersPage from '../index';

jest.mock('../../../hooks', () => ({
  useForm: jest.fn(),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{ en: {} }} textComponent="span">
      <ProvidersPage />
    </IntlProvider>
  </ThemeProvider>
);

describe('Admin | containers | ProvidersPage', () => {
  it('renders and matches the snapshot', () => {
    useForm.mockImplementation(() => ({
      allowedActions: { canUpdate: true },
      isLoading: true,
      isLoadingForPermissions: true,
      modifiedData: {},
    }));

    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c10 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-pack: space-around;
        -webkit-justify-content: space-around;
        -ms-flex-pack: space-around;
        justify-content: space-around;
        width: 100%;
        height: 100vh;
      }

      .c10 > div {
        margin: auto;
        width: 50px;
        height: 50px;
        border: 6px solid #f3f3f3;
        border-top: 6px solid #1c91e7;
        border-radius: 50%;
        -webkit-animation: cilQsd 2s linear infinite;
        animation: cilQsd 2s linear infinite;
      }

      .c1 {
        padding-bottom: 56px;
      }

      .c4 {
        background: #f6f6f9;
        padding-top: 56px;
        padding-right: 56px;
        padding-bottom: 56px;
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
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c8 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c9 {
        font-size: 1rem;
        line-height: 1.5;
      }

      .c3 {
        outline: none;
      }

      <div
        class="c0"
      >
        <div
          class="c1 c2"
        >
          <main
            aria-labelledby="Providers"
            class="c3"
            id="main-content"
            tabindex="-1"
          >
            <div
              class=""
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
                      id="providers"
                    >
                      Providers
                    </h1>
                  </div>
                </div>
                <p
                  class="c8 c9"
                />
              </div>
            </div>
            <div
              class="c10"
              data-testid="loader"
            >
              <div />
            </div>
          </main>
        </div>
      </div>
    `);
  });

  describe('Shows a loading state', () => {
    it('should show a loader when it is loading for the data and not for the permissions', () => {
      useForm.mockImplementation(() => ({
        allowedActions: { canUpdate: true },
        isLoading: true,
        isLoadingForPermissions: false,
        modifiedData: {},
      }));

      render(App);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('should show a loader when it is loading for the permissions', () => {
      useForm.mockImplementation(() => ({
        allowedActions: { canUpdate: true },
        isLoading: false,
        isLoadingForPermissions: true,
        modifiedData: {},
      }));

      render(App);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  it('should show a list of providers', () => {
    useForm.mockImplementation(() => ({
      allowedActions: { canUpdate: true },
      isLoading: false,
      isLoadingForPermissions: false,
      modifiedData: {
        email: { enabled: true, icon: 'envelope' },
        discord: {
          callback: '/auth/discord/callback',
          enabled: false,
          icon: 'discord',
          key: '',
          scope: ['identify', 'email'],
          secret: '',
        },
      },
    }));

    render(App);

    expect(screen.getByText('email')).toBeInTheDocument();
    const element = screen.getByTestId('enable-email');
    expect(element.textContent).toEqual('Enabled');
    expect(screen.getByTestId('enable-discord').textContent).toEqual('Disabled');
  });
});
