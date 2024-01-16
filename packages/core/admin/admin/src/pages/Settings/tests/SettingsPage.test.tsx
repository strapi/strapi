import { AppInfoContext, StrapiAppProvider, StrapiAppProviderProps } from '@strapi/helper-plugin';
import { render as baseRender, screen } from '@tests/utils';
import { Route, Routes, useLocation } from 'react-router-dom';

import { useSettingsMenu } from '../../../hooks/useSettingsMenu';
import { Layout } from '../Layout';

jest.mock('../../../hooks/useSettingsMenu');

const LocationDisplay = () => {
  const location = useLocation();

  return <span data-testid="location-display">{location.pathname}</span>;
};

const render = (settings: StrapiAppProviderProps['settings']) =>
  baseRender(<Route path="/settings?/:settingId" element={<Layout />} />, {
    initialEntries: ['/settings'],
    renderOptions: {
      wrapper({ children }) {
        return (
          <AppInfoContext.Provider
            value={{
              shouldUpdateStrapi: false,
              setUserDisplayName: () => {},
              userDisplayName: '',
            }}
          >
            <StrapiAppProvider
              settings={settings}
              plugins={{}}
              getPlugin={jest.fn()}
              getAdminInjectedComponents={jest.fn()}
              runHookParallel={jest.fn()}
              runHookWaterfall={jest.fn()}
              runHookSeries={jest.fn()}
              menu={[]}
            >
              <Routes>{children}</Routes>
              <LocationDisplay />
            </StrapiAppProvider>
          </AppInfoContext.Provider>
        );
      },
    },
  });

describe('ADMIN | pages | SettingsPage', () => {
  it('should redirect to the application-infos', async () => {
    render({
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [],
      },
    });

    await screen.findByText('/settings/application-infos');
  });

  it('should create the plugins routes correctly', async () => {
    // @ts-expect-error - mocking for test
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

    const { user } = render({
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
            permissions: [],
            to: '/settings/internationalization',
            // @ts-expect-error – this expects lazy components, but we're not doing it in the test
            Component: () => <div>i18n settings</div>,
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
            permissions: [],
            to: '/settings/email-settings',
            // @ts-expect-error – this expects lazy components, but we're not doing it in the test
            Component: () => <div>email settings</div>,
          },
        ],
      },
    });

    await screen.findByText('/settings/application-infos');

    await user.click(screen.getByText('Internationalization'));

    await screen.findByText('/settings/internationalization');

    await user.click(screen.getByText('email'));

    await screen.findByText('/settings/email-settings');
  });
});
