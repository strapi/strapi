import React from 'react';
import { Router, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { StrapiAppProvider, AppInfosContext } from '@strapi/helper-plugin';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { SettingsPage } from '..';

import { useSettingsMenu } from '../../../hooks';
import theme from '../../../themes';

jest.mock('../../../hooks', () => ({
  useSettingsMenu: jest.fn(() => ({ isLoading: false, menu: [] })),
  useAppInfos: jest.fn(() => ({ shouldUpdateStrapi: false })),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => id) }),
}));
jest.mock('../../ApplicationInfosPage', () => () => <h1>App infos</h1>);

const makeApp = (history, settings) => (
  <ThemeProvider theme={theme}>
    <AppInfosContext.Provider value={{ shouldUpdateStrapi: false }}>
      <StrapiAppProvider
        settings={settings}
        plugins={{}}
        getPlugin={jest.fn()}
        runHookParallel={jest.fn()}
        runHookWaterfall={jest.fn()}
        runHookSeries={jest.fn()}
      >
        <Router history={history}>
          <Route path="/settings/:settingId" component={SettingsPage} />
          <Route path="/settings" component={SettingsPage} />
        </Router>
      </StrapiAppProvider>
    </AppInfosContext.Provider>
  </ThemeProvider>
);

describe('ADMIN | pages | SettingsPage', () => {
  it('should not crash', () => {
    const history = createMemoryHistory();
    const App = makeApp(history, {
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [],
      },
    });
    const route = '/settings/application-infos';
    history.push(route);

    const { container } = render(App);

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c5 {
        margin: 0;
        line-height: 34px;
        color: #292b2c;
        font-size: 13px;
        font-weight: 400;
        text-transform: none;
      }

      .c1 {
        position: fixed;
        top: 0;
        height: 6rem;
        width: 6.5rem;
        line-height: 6rem;
        z-index: 1050;
        text-align: center;
        background-color: #ffffff;
        color: #81848a;
        border-top: 1px solid #f3f4f4;
        border-right: 1px solid #f3f4f4;
        border-left: 1px solid #f3f4f4;
        cursor: pointer;
      }

      .c1:before {
        content: '\\f053';
        font-family: 'FontAwesome';
        font-size: 1.8rem;
        font-weight: bolder;
      }

      .c1:hover {
        background-color: #f3f4f4;
      }

      .c6 {
        width: 100%;
        height: calc(100vh - 6rem);
        min-height: 100%;
        background-color: #f2f3f4;
        padding-top: 3.4rem;
        padding-left: 2rem;
        padding-right: 2rem;
      }

      .c6 > div {
        margin-bottom: 29px;
      }

      .c4 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
        position: relative;
        padding-left: 30px;
        height: 34px;
        border-radius: 2px;
      }

      .c4.active {
        background-color: #e9eaeb;
      }

      .c4.active > p {
        font-weight: 600;
      }

      .c4.active > svg {
        color: #2d3138;
      }

      .c4:hover {
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c3 {
        position: relative;
        margin-bottom: -5px;
        padding: 25px 20px 0 20px;
      }

      .c2 {
        background-color: #f2f3f4;
        min-height: 100%;
        height: calc(100vh - 6rem);
      }

      .c7 {
        min-height: unset;
        height: unset;
      }

      .c7 > div {
        margin-bottom: 27px;
      }

      .c0 > .row {
        padding-left: 0;
        padding-right: 30px;
      }

      .c0 > .row .col-md-9 {
        padding-top: 18px;
      }

      <div
        class="c0"
      >
        <div
          class="c1"
        />
        <div
          class="row"
        >
          <div
            class="col-md-3"
          >
            <div
              class="c2"
            >
              <div
                class="c3"
              >
                <a
                  aria-current="page"
                  class="c4 active"
                  href="/settings/application-infos"
                >
                  <p
                    class="c5"
                    color="greyDark"
                    font-size="md"
                    font-weight="regular"
                  >
                    Settings.application.title
                  </p>
                </a>
              </div>
              <div
                class="c6 c7"
              />
            </div>
          </div>
          <div
            class="col-md-9"
          >
            <h1>
              App infos
            </h1>
          </div>
        </div>
      </div>
    `);
  });

  it('should redirect to the application-infos', async () => {
    const history = createMemoryHistory();
    const App = makeApp(history, {
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [],
      },
    });
    const route = '/settings';
    history.push(route);

    render(App);

    await screen.findByText('App infos');

    expect(screen.getByText(/App infos/)).toBeInTheDocument();
  });

  it('should create the plugins routes correctly', async () => {
    useSettingsMenu.mockImplementation(() => ({
      isLoading: false,
      menu: [
        {
          id: 'global',
          intlLabel: {
            defaultMessage: 'Global Settings',
            id: 'Settings.global',
          },
          links: [
            {
              id: 'internationalization',
              intlLabel: { id: 'i18n.plugin.name', defaultMessage: 'Internationalization' },
              isDisplayed: true,
              permissions: [],
              to: '/settings/internationalization',
              Component: () => ({ default: () => <div>i18n settings</div> }),
            },
          ],
        },
        {
          id: 'email',
          intlLabel: { id: 'email.plugin', defaultMessage: 'email plugin' },
          links: [
            {
              id: 'email-settings',
              intlLabel: { id: 'email', defaultMessage: 'email' },
              isDisplayed: true,
              permissions: [],
              to: '/settings/email-settings',
              Component: () => ({ default: () => <div>email settings</div> }),
            },
          ],
        },
      ],
    }));

    const history = createMemoryHistory();
    const App = makeApp(history, {
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [
          {
            id: 'internationalization',
            intlLabel: { id: 'i18n.plugin.name', defaultMessage: 'Internationalization' },
            isDisplayed: true,
            permissions: [],
            to: '/settings/internationalization',
            Component: () => ({ default: () => <div>i18n settings</div> }),
          },
        ],
      },
      email: {
        id: 'email',
        intlLabel: { id: 'email.plugin', defaultMessage: 'email plugin' },
        links: [
          {
            id: 'email-settings',
            intlLabel: { id: 'email', defaultMessage: 'email' },
            isDisplayed: true,
            permissions: [],
            to: '/settings/email-settings',
            Component: () => ({ default: () => <div>email settings</div> }),
          },
        ],
      },
    });
    const route = '/settings/application-infos';
    history.push(route);

    render(App);

    expect(screen.getByText(/App infos/)).toBeInTheDocument();

    userEvent.click(screen.getByText('i18n.plugin.name'));

    await waitFor(() => {
      expect(screen.getByText(/i18n settings/)).toBeInTheDocument();
    });

    userEvent.click(screen.getByText('email'));

    await waitFor(() => {
      expect(screen.getByText(/email settings/)).toBeInTheDocument();
    });
  });
});
