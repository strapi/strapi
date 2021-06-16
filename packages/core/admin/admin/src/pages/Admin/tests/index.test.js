import React from 'react';
import { ThemeProvider } from 'styled-components';
import { Router } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { useStrapiApp } from '@strapi/helper-plugin';
import themes from '../../../themes';
import { useMenu } from '../../../hooks';
import Admin from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  LoadingIndicatorPage: () => <div>Loading</div>,
  useStrapiApp: jest.fn(() => ({ menu: [] })),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  NotFound: () => <div>not found</div>,
  CheckPagePermissions: ({ children }) => children,
}));

jest.mock('../../../hooks', () => ({
  useMenu: jest.fn(() => ({ isLoading: true, generalSectionLinks: [], pluginsSectionLinks: [] })),
  useTrackUsage: jest.fn(),
  useReleaseNotification: jest.fn(),
}));

jest.mock('../../../components/LeftMenu', () => () => <div>menu</div>);

jest.mock('../Logout', () => () => <div>Logout</div>);
jest.mock('../../HomePage', () => () => <div>HomePage</div>);

const makeApp = history => (
  <ThemeProvider theme={themes}>
    <Router history={history}>
      <Admin />
    </Router>
  </ThemeProvider>
);

describe('<Admin />', () => {
  it('should not crash', () => {
    const history = createMemoryHistory();
    const App = makeApp(history);

    const { container } = render(App);

    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        Loading
      </div>
    `);
  });

  it('should create the plugin routes correctly', async () => {
    useStrapiApp.mockImplementation(() => ({
      menu: [
        {
          to: '/plugins/content-manager',
        },
        {
          to: '/plugins/documentation',
          Component: () => <div>DOCUMENTATION PLUGIN</div>,
        },
      ],
    }));

    useMenu.mockImplementation(() => ({
      isLoading: false,
      generalSectionLinks: [],
      pluginsSectionLinks: [],
    }));
    const history = createMemoryHistory();
    const App = makeApp(history);

    render(App);

    await waitFor(() => expect(screen.getByText('HomePage')).toBeInTheDocument());

    history.push('/plugins/documentation');

    await waitFor(() => expect(screen.getByText('DOCUMENTATION PLUGIN')).toBeInTheDocument());
  });
});
