import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ConfigurationsProvider from '../index';
import { useConfigurations } from '../../../hooks';

describe('ConfigurationsProvider', () => {
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

  it('should update customMenuLogo with setCustomMenuLogo', () => {
    const Test = () => {
      const {
        updateProjectSettings,
        logos: { menu },
      } = useConfigurations();

      return (
        <div>
          <button type="button" onClick={() => updateProjectSettings({ menuLogo: 'michka.jpg' })}>
            Change logo
          </button>
          <div>{menu.custom}</div>
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

  it('should give access to defaultMenuLogo', () => {
    const Test = () => {
      const {
        logos: { menu },
      } = useConfigurations();

      return (
        <div>
          <div>{menu.default}</div>
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

    expect(queryByText('strapi-menu.jpg')).toBeInTheDocument();
  });
});
