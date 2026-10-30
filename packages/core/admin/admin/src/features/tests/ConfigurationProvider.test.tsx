import { render, waitFor, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useConfiguration, ConfigurationProvider } from '../Configuration';

const TestComponent = () => {
  const context = useConfiguration('TestComponent');

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          context.updateProjectSettings({
            menuLogo: {
              name: 'michka.jpg',
              width: 1,
              height: 1,
              ext: 'jpg',
              size: 2,
              url: 'michka.jpg',
            },
            authLogo: null,
          })
        }
      >
        Change logo
      </button>
      <div>{context.logos.menu.custom?.url ?? context.logos.menu.default}</div>
    </div>
  );
};

describe('ConfigurationProvider', () => {
  beforeAll(() => {
    window.localStorage.setItem('jwtToken', JSON.stringify('test-token'));
    // A stored token fetches /users/me/permissions. The default handler returns
    // none, and useRBAC re-checks when that response arrives, which skips
    // project settings. This page needs the read permission to load the logo.
    server.use(
      http.get('/admin/users/me/permissions', () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              action: 'admin::project-settings.read',
              subject: null,
              actionParameters: {},
              conditions: [],
              properties: {},
            },
          ],
        })
      )
    );
  });

  afterAll(() => {
    server.restoreHandlers();
  });

  it('should not crash', async () => {
    render(
      <ConfigurationProvider
        defaultAuthLogo={'strapi.jpg'}
        defaultMenuLogo={'strapi.jpg'}
        showReleaseNotification={false}
      >
        <TestComponent />
      </ConfigurationProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

    await screen.findByText('http://localhost:1337/uploads/michka.svg');
  });

  it.skip('should use the default logo and update customMenuLogo with setCustomMenuLogo', async () => {
    const { user } = render(
      <ConfigurationProvider
        defaultAuthLogo={'strapi.jpg'}
        defaultMenuLogo={'strapi.jpg'}
        showReleaseNotification={false}
      >
        <TestComponent />
      </ConfigurationProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Change logo' }));

    await screen.findByText('Saved');

    expect(screen.getByText('http://localhost:1337/uploads/michka.svg')).toBeInTheDocument();
  });
});
