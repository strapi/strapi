import { render } from '@tests/utils';

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
  });

  it('should not crash', async () => {
    const { getByText, findByText } = render(
      <ConfigurationProvider
        authLogo={{
          default: 'strapi.jpg',
        }}
        menuLogo={{
          default: 'strapi.jpg',
        }}
        showReleaseNotification={false}
        showTutorials={false}
      >
        <TestComponent />
      </ConfigurationProvider>
    );

    expect(getByText('strapi.jpg')).toBeInTheDocument();

    await findByText('http://localhost:1337/uploads/michka.svg');
  });

  it('should use the default logo and update customMenuLogo with setCustomMenuLogo', async () => {
    const { user, getByRole, findByText, getByText } = render(
      <ConfigurationProvider
        authLogo={{
          default: 'strapi.jpg',
        }}
        menuLogo={{
          default: 'strapi.jpg',
        }}
        showReleaseNotification={false}
        showTutorials={false}
      >
        <TestComponent />
      </ConfigurationProvider>
    );

    expect(getByText('strapi.jpg')).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Change logo' }));

    await findByText('Saved');

    expect(getByText('http://localhost:1337/uploads/michka.svg')).toBeInTheDocument();
  });
});
