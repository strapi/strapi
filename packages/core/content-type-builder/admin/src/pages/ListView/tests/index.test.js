/**
 *
 * Tests for ListView
 *
 */

import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { lightTheme, darkTheme } from '@strapi/design-system';
import LanguageProvider from '@strapi/admin/admin/src/components/LanguageProvider';
import Theme from '@strapi/admin/admin/src/components/Theme';
import ThemeToggleProvider from '@strapi/admin/admin/src/components/ThemeToggleProvider';
import en from '@strapi/admin/admin/src/translations/en.json';
import FormModalNavigationProvider from '../../../components/FormModalNavigationProvider';
import pluginEn from '../../../translations/en.json';
import getTrad from '../../../utils/getTrad';

import ListView from '../index';
import mockData from './mockData';

jest.mock('../../../hooks/useDataManager', () => {
  return jest.fn(() => ({
    initialData: mockData,
    modifiedData: mockData,
    isInDevelopmentMode: true,
    isInContentTypeView: true,
    submitData() {},
    toggleModalCancel() {},
  }));
});

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

const makeApp = () => {
  const history = createMemoryHistory();
  const messages = {
    en: Object.keys(pluginEn).reduce(
      (acc, current) => {
        acc[getTrad(current)] = pluginEn[current];

        return acc;
      },
      { ...en }
    ),
  };

  const localeNames = { en: 'English' };

  return (
    <LanguageProvider messages={messages} localeNames={localeNames}>
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <Router history={history}>
            <FormModalNavigationProvider>
              <ListView />
            </FormModalNavigationProvider>
          </Router>
        </Theme>
      </ThemeToggleProvider>
    </LanguageProvider>
  );
};

describe('<ListView />', () => {
  it('renders and matches the snapshot', () => {
    const App = makeApp();
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });
});
