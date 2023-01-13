import React from 'react';
import { IntlProvider } from 'react-intl';
import { render as renderTL } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import CustomizationInfos from '..';

const PROJECT_SETTINGS_DATA_FIXTURES = {
  authLogo: {
    ext: '.jpeg',
    height: 250,
    name: 'authLogo.jpeg',
    size: 46.26,
    url: 'uploads/auth.jpeg',
    width: 340,
  },
  menuLogo: {
    ext: '.jpeg',
    height: 250,
    name: 'menuLogo.jpeg',
    size: 46.26,
    url: 'uploads/menu.jpeg',
    width: 340,
  },
};

jest.mock('@strapi/helper-plugin', () => ({
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));
jest.mock('../../../../../../../hooks', () => ({
  useConfigurations: jest.fn(() => ({
    logos: {
      menu: { custom: 'customMenuLogo.png', default: 'defaultMenuLogo.png' },
      auth: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
    },
  })),
}));

const render = (props) =>
  renderTL(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <CustomizationInfos
          canUpdate
          projectSettingsStored={PROJECT_SETTINGS_DATA_FIXTURES}
          {...props}
        />
      </IntlProvider>
    </ThemeProvider>
  );

describe('ApplicationInfosPage | Form', () => {
  it('should display logo inputs', () => {
    const { getByText } = render();

    expect(getByText('Menu logo')).toBeInTheDocument();
    expect(getByText('Auth logo')).toBeInTheDocument();
  });

  it('should disable logo input actions if users do not have update permissions', () => {
    const { getAllByRole } = render({ canUpdate: false });

    getAllByRole('button', { name: 'Change logo' }).map((button) =>
      expect(button).toHaveAttribute('aria-disabled', 'true')
    );

    getAllByRole('button', { name: 'Reset logo' }).map((button) =>
      expect(button).toHaveAttribute('aria-disabled', 'true')
    );
  });
});
