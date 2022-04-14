import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';
import { Router, Route } from 'react-router-dom';
import { lightTheme, darkTheme } from '@strapi/design-system';
import { TrackingContext } from '@strapi/helper-plugin';
import Theme from '../../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../../components/ThemeToggleProvider';
import PaginationFooter from '../index';

const makeApp = (history, pagination) => {
  return (
    <TrackingContext.Provider value={{ uuid: null, telemetryProperties: undefined }}>
      <IntlProvider messages={{}} textComponent="span" locale="en" defaultLocale="en">
        <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
          <Theme>
            <Router history={history}>
              <Route path="/settings/user">
                <PaginationFooter pagination={pagination} />
              </Route>
            </Router>
          </Theme>
        </ThemeToggleProvider>
      </IntlProvider>
    </TrackingContext.Provider>
  );
};

describe('DynamicTable', () => {
  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    const pagination = { pageCount: 2 };
    history.push('/settings/user?pageSize=10&page=1&sort=firstname');
    const app = makeApp(history, pagination);

    const { container } = render(app);

    expect(container).toMatchSnapshot();
  });
});
