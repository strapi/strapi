/**
 *
 * Tests for ContentTypeBuilderNav
 *
 */

import { Layout, lightTheme, darkTheme } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import LanguageProvider from '../../../../../../admin/admin/src/components/LanguageProvider';
import Theme from '../../../../../../admin/admin/src/components/Theme';
import ThemeToggleProvider from '../../../../../../admin/admin/src/components/ThemeToggleProvider';
import en from '../../../../../../admin/admin/src/translations/en.json';
import ContentTypeBuilderNav from '../index';
import mockData from './mockData';

jest.mock('../useContentTypeBuilderMenu.js', () => {
  return jest.fn(() => ({
    menu: mockData,
    searchValue: '',
    onSearchChange: () => {},
  }));
});

const makeApp = () => {
  const history = createMemoryHistory();
  const messages = { en };
  const localeNames = { en: 'English' };

  return (
    <LanguageProvider messages={messages} localeNames={localeNames}>
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <Router history={history}>
            <Layout sideNav={<ContentTypeBuilderNav />}>
              <div />
            </Layout>
          </Router>
        </Theme>
      </ThemeToggleProvider>
    </LanguageProvider>
  );
};

describe('<ContentTypeBuilderNav />', () => {
  it('renders and matches the snapshot', () => {
    const App = makeApp(ContentTypeBuilderNav);
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });
});
