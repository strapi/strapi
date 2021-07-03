import React from 'react';
import { Router, Route, Link } from 'react-router-dom';
import { StrapiAppProvider } from '@strapi/helper-plugin';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { PluginDispatcher } from '../index';

const Email = () => <div>Email Plugin</div>;

const makeApp = (history, plugins) => (
  <StrapiAppProvider plugins={plugins}>
    <Router history={history}>
      <Link to="/plugins/email">Go to email</Link>
      <Route path="/plugins/:pluginId" component={PluginDispatcher} />
      <Route path="/404" component={() => <h1>404</h1>} />
    </Router>
  </StrapiAppProvider>
);

describe('<PluginDispatcher />', () => {
  it('should not crash', () => {
    const history = createMemoryHistory();
    const App = makeApp(history, {});

    const { container } = render(App);

    expect(container.firstChild).toMatchInlineSnapshot(`
      <a
        href="/plugins/email"
      >
        Go to email
      </a>
    `);
  });

  it('should redirect to the 404 page if the params does not match the pluginId', () => {
    const plugins = {
      email: {
        mainComponent: Email,
        name: 'email',
      },
    };
    const history = createMemoryHistory();
    const route = '/plugins/email-test';
    history.push(route);

    const App = makeApp(history, plugins);

    render(App);

    expect(screen.getByText(/404/i)).toBeInTheDocument();
  });

  it('should match the pluginId params with the correct plugin', () => {
    const plugins = {
      email: {
        mainComponent: Email,
        name: 'email',
      },
    };
    const history = createMemoryHistory();

    const App = makeApp(history, plugins);

    render(App);

    const leftClick = { button: 0 };
    userEvent.click(screen.getByText(/Go to email/i), leftClick);

    expect(screen.getByText(/Email Plugin/i)).toBeInTheDocument();
  });
});
