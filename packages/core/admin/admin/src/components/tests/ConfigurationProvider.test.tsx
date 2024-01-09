import { render } from '@tests/utils';

import { useConfiguration } from '../../contexts/configuration';
import { ConfigurationProvider } from '../ConfigurationProvider';

describe('ConfigurationProvider', () => {
  it('should not crash', () => {
    const { getByText } = render(
      <ConfigurationProvider
        authLogo="strapi.jpg"
        menuLogo="strapi.jpg"
        showReleaseNotification={false}
        showTutorials={false}
      >
        <div>Test</div>
      </ConfigurationProvider>
    );

    expect(getByText('Test')).toBeInTheDocument();
  });

  it('should use the default logo and update customMenuLogo with setCustomMenuLogo', async () => {
    const Test = () => {
      const {
        updateProjectSettings,
        logos: { menu },
      } = useConfiguration();

      return (
        <div>
          <button type="button" onClick={() => updateProjectSettings({ menuLogo: 'michka.jpg' })}>
            Change logo
          </button>
          <div>{menu.custom ?? menu.default}</div>
        </div>
      );
    };

    const { user, getByRole, queryByText, getByText } = render(
      <ConfigurationProvider
        authLogo="strapi-auth.jpg"
        menuLogo="strapi-menu.jpg"
        showReleaseNotification={false}
        showTutorials={false}
      >
        <Test />
      </ConfigurationProvider>
    );

    expect(getByText('strapi-menu.jpg')).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Change logo' }));

    expect(getByText('michka.jpg')).toBeInTheDocument();
    expect(queryByText('strapi-menu.jpg')).not.toBeInTheDocument();
  });
});
