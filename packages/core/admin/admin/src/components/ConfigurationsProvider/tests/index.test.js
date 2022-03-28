import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ConfigurationsProvider from '../index';
import { useConfigurations } from '../../../hooks';

describe('LanguageProvider', () => {
  it('should not crash', () => {
    const { container } = render(
      <ConfigurationsProvider
        authLogo="strapi.jpg"
        menuLogo="strapi.jpg"
        showReleaseNotification={false}
        showTutorials={false}
      >
        <div>Test</div>
      </ConfigurationsProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        Test
      </div>
    `);
  });

  it('should update menuLogo with new logo when calling setMenuLogo with logo', () => {
    const Test = () => {
      const { setMenuLogo, menuLogo } = useConfigurations();

      return (
        <div>
          <button type="button" onClick={() => setMenuLogo('michka.jpg')}>
            Change logo
          </button>
          <div>{menuLogo.logo}</div>
        </div>
      );
    };

    const { queryByText } = render(
      <ConfigurationsProvider
        authLogo="strapi-auth.jpg"
        menuLogo="strapi-menu.jpg"
        showReleaseNotification={false}
        showTutorials={false}
      >
        <Test />
      </ConfigurationsProvider>
    );

    fireEvent.click(screen.getByText('Change logo'));

    expect(queryByText('michka.jpg')).toBeInTheDocument();
    expect(queryByText('strapi-menu.jpg')).not.toBeInTheDocument();
  });

  it('should update menuLogo with defaultLogo when calling setMenuLogo without logo', () => {
    const Test = () => {
      const { setMenuLogo, menuLogo } = useConfigurations();

      return (
        <div>
          <button type="button" onClick={() => setMenuLogo()}>
            Change logo
          </button>
          <div>{menuLogo.logo}</div>
        </div>
      );
    };

    const { queryByText } = render(
      <ConfigurationsProvider
        authLogo="strapi-auth.jpg"
        menuLogo="strapi-menu.jpg"
        showReleaseNotification={false}
        showTutorials={false}
      >
        <Test />
      </ConfigurationsProvider>
    );

    fireEvent.click(screen.getByText('Change logo'));

    expect(queryByText('strapi-menu.jpg')).toBeInTheDocument();
  });
});
