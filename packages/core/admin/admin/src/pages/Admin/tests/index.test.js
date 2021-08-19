import React from 'react';
import { Router } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { useStrapiApp } from '@strapi/helper-plugin';
import Theme from '../../../components/Theme';
import { useMenu } from '../../../hooks';
import Admin from '../index';

jest.mock('react-intl', () => ({
  // eslint-disable-next-line react/prop-types
  FormattedMessage: ({ id }) => <p>{id}</p>,
}));

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
  useConfigurations: jest.fn(() => ({ showTutorials: false })),
}));

jest.mock('../../../components/LeftMenu', () => () => <div>menu</div>);

jest.mock('../Logout', () => () => <div>Logout</div>);
jest.mock('../../HomePage', () => () => <div>HomePage</div>);

const makeApp = history => (
  <Theme>
    <Router history={history}>
      <Admin />
    </Router>
  </Theme>
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
          to: '/plugins/ctb',
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

    // history.push('/plugins/documentation');

    // await waitFor(() => expect(screen.getByText('DOCUMENTATION PLUGIN')).toBeInTheDocument());
  });
});
