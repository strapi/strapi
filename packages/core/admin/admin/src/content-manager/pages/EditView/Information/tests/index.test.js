/**
 *
 * Tests for Information
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../components/ThemeToggleProvider';
import Information from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  useCMEditViewDataManager: jest.fn(),
  wrapAxiosInstance: jest.fn(() => {}),
}));

const makeApp = () => {
  return (
    <IntlProvider
      locale="en"
      defaultLocale="en"
      messages={{ 'containers.Edit.information': 'Information' }}
    >
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <Information />
        </Theme>
      </ThemeToggleProvider>
    </IntlProvider>
  );
};

describe('CONTENT MANAGER | EditView | Information', () => {
  const RealNow = Date.now;

  beforeAll(() => {
    global.Date.now = jest.fn(() => new Date('2021-09-20').getTime());
  });

  afterAll(() => {
    global.Date.now = RealNow;
  });

  it('renders and matches the snaphsot', () => {
    useCMEditViewDataManager.mockImplementationOnce(() => ({
      initialData: {},
      isCreatingEntry: true,
    }));

    const {
      container: { firstChild },
    } = render(makeApp());

    expect(firstChild).toMatchSnapshot();
  });
});
