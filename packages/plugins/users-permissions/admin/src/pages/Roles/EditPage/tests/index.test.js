import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { Router, Switch, Route } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';

import pluginId from '../../../../pluginId';
import RolesEditPage from '..';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
}));

jest.mock('../../../../hooks', () => {
  const originalModule = jest.requireActual('../../../../hooks');

  return {
    ...originalModule,
    useFetchRole: id => {
      const role = {
        id,
        name: 'Authenticated',
        description: 'Default role given to authenticated user.',
        type: 'authenticated',
      };
      const onSubmitSucceed = jest.fn();

      return { role, onSubmitSucceed };
    },
  };
});

it('renders users-permissions edit role and matches snapshot', () => {
  const history = createMemoryHistory();

  const app = (
    <IntlProvider locale="en" messages={{ en: {} }} textComponent="span">
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <Switch>
            <Route path={`/settings/${pluginId}/roles/:id`} component={RolesEditPage} />
          </Switch>
        </Router>
      </ThemeProvider>
    </IntlProvider>
  );

  const { container } = render(app);
  history.push(`/settings/${pluginId}/roles/1`);

  expect(container.firstChild).toMatchInlineSnapshot(`
    .c4 {
      font-weight: 600;
      font-size: 2rem;
      line-height: 1.25;
      color: #32324d;
    }

    .c5 {
      font-weight: 400;
      font-size: 0.875rem;
      line-height: 1.43;
      color: #666687;
    }

    .c6 {
      font-size: 1rem;
      line-height: 1.5;
    }

    .c1 {
      background: #f6f6f9;
      padding-top: 56px;
      padding-right: 56px;
      padding-bottom: 56px;
      padding-left: 56px;
    }

    .c2 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: row;
      -ms-flex-direction: row;
      flex-direction: row;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      -ms-flex-pack: justify;
      justify-content: space-between;
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
    }

    .c3 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: row;
      -ms-flex-direction: row;
      flex-direction: row;
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
    }

    .c0 {
      outline: none;
    }

    <main
      aria-labelledby="title"
      class="c0"
      id="main-content"
      tabindex="-1"
    >
      <form>
        <div
          class=""
        >
          <div
            class="c1"
            data-strapi-header="true"
          >
            <div
              class="c2"
            >
              <div
                class="c3"
              >
                <h1
                  class="c4"
                  id="title"
                >
                  Authenticated
                </h1>
              </div>
            </div>
            <p
              class="c5 c6"
            >
              Default role given to authenticated user.
            </p>
          </div>
        </div>
      </form>
    </main>
  `);
});
