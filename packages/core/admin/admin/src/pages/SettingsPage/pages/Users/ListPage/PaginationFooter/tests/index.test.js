import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';
import { Router, Route } from 'react-router-dom';
import Theme from '../../../../../../../components/Theme';
import PaginationFooter from '../index';

const makeApp = (history, pagination) => {
  return (
    <IntlProvider messages={{}} textComponent="span" locale="en" defaultLocale="en">
      <Theme>
        <Router history={history}>
          <Route path="/settings/user">
            <PaginationFooter pagination={pagination} />
          </Route>
        </Router>
      </Theme>
    </IntlProvider>
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
