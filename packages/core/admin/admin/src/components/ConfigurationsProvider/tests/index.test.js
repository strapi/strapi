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

  it.only('should update menuLogo with setMenuLogo', () => {
    const Test = () => {
      const { setMenuLogo, menuLogo } = useConfigurations();
      console.log('tests', menuLogo);

      return (
        <div>
          <button type="button" onClick={() => setMenuLogo('michka.jpg')}>
            Change logo
          </button>
          <div>{menuLogo.logo}</div>
        </div>
      );
    };

    const { container } = render(
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

    expect(container).toMatchInlineSnapshot(`
      <div>
        <div>
          <button
            type="button"
          >
            Change logo
          </button>
          <div>
            strapi-menu.jpg
          </div>
        </div>
      </div>
    `);
  });
});
