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
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
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
    global.Date.now = jest.fn(() => new Date('2022-09-20').getTime());
  });

  afterAll(() => {
    global.Date.now = RealNow;
  });

  it('renders and matches the snaphsot in case an entry is created', () => {
    useCMEditViewDataManager.mockImplementationOnce(() => ({
      initialData: {},
      isCreatingEntry: true,
    }));

    const {
      container: { firstChild },
    } = render(makeApp());

    expect(firstChild).toMatchSnapshot();
  });

  it('renders and matches the snaphsot in case an entry is edited', () => {
    useCMEditViewDataManager.mockImplementationOnce(() => ({
      initialData: {
        updatedAt: 'Fri Jan 13 2022 13:10:14 GMT+0100',
        updatedBy: {
          firstname: 'First name',
          lastname: 'Last name',
        },

        createdAt: 'Fri Jan 13 2022 12:10:14 GMT+0100',
        createdBy: {
          firstname: 'First name',
          lastname: 'Last name',
        },
      },
      isCreatingEntry: false,
    }));

    const {
      container: { firstChild },
    } = render(makeApp());

    expect(firstChild).toMatchSnapshot();
  });

  it('renders and matches the snaphsot in case a username is set', () => {
    useCMEditViewDataManager.mockImplementationOnce(() => ({
      initialData: {
        updatedAt: 'Fri Jan 13 2022 13:10:14 GMT+0100',
        updatedBy: {
          firstname: 'First name',
          lastname: 'Last name',
          username: 'user@strapi.io',
        },

        createdAt: 'Fri Jan 13 2022 12:10:14 GMT+0100',
        createdBy: {
          firstname: 'First name',
          lastname: 'Last name',
          username: 'user@strapi.io',
        },
      },
      isCreatingEntry: false,
    }));

    const {
      container: { firstChild },
    } = render(makeApp());

    expect(firstChild).toMatchSnapshot();
  });
});
