/**
 *
 * Tests for ContentTypeBuilderNav
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import Theme from '../../../../../../admin/admin/src/components/Theme';
import LanguageProvider from '../../../../../../admin/admin/src/components/LanguageProvider';
import en from '../../../../../../admin/admin/src/translations/en.json';

import ContentTypeBuilderNav from '../index';

const makeApp = () => {
  const history = createMemoryHistory();
  const messages = { en };
  const localeNames = { en: 'English' };

  return (
    <LanguageProvider messages={messages} localeNames={localeNames}>
      <Theme>
        <Router history={history}>
          <Route path="/plugins/content-type-builder">
            <ContentTypeBuilderNav />
          </Route>
        </Router>
      </Theme>
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
