import React from 'react';
import { render } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { useAppInfo } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import HomePage from '../index';
import { useModels } from '../../../hooks';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useAppInfo: jest.fn(() => ({ communityEdition: true })),
  useGuidedTour: jest.fn(() => ({
    isGuidedTourVisible: false,
    guidedTourState: {
      apiTokens: {
        create: false,
        success: false,
      },
      contentManager: {
        create: false,
        success: false,
      },
      contentTypeBuilder: {
        create: false,
        success: false,
      },
    },
  })),
}));

jest.mock('../../../hooks', () => ({
  useModels: jest.fn(),
}));

jest.mock('ee_else_ce/hooks/useLicenseLimitNotification', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const history = createMemoryHistory();

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <Router history={history}>
        <HomePage />
      </Router>
    </IntlProvider>
  </ThemeProvider>
);

describe('Homepage', () => {
  useModels.mockImplementation(() => ({
    isLoading: false,
    collectionTypes: [],
    singleTypes: [],
  }));

  test('should render all homepage links', () => {
    const { getByRole } = render(App);
    expect(getByRole('link', { name: /we are hiring/i })).toBeInTheDocument();
  });

  test.each([
    'strapi cloud a fully composable, and collaborative platform to boost your team velocity.',
    'documentation discover the essential concepts, guides and instructions.',
    'code example learn by using ready-made starters for your projects.',
    'tutorials follow step-by-step instructions to use and customize strapi.',
    'blog read the latest news about strapi and the ecosystem.',
    'see our road map',
    'github',
    'discord',
    'reddit',
    'twitter',
    'forum',
    'we are hiring',
  ])('should display %s link', (link) => {
    const { getByRole } = render(App);

    expect(getByRole('link', { name: new RegExp(link, 'i') })).toBeInTheDocument();
  });

  test('should display discord link for CE edition', () => {
    const { getByRole } = render(App);

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://discord.strapi.io'
    );
  });

  test('should display support link for EE edition', () => {
    useAppInfo.mockImplementation(() => ({ communityEdition: false }));
    const { getByRole } = render(App);

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://support.strapi.io/support/home'
    );
  });

  it('should display particular text and action when there are no collectionTypes and singletypes', () => {
    const { getByText, getByRole } = render(App);

    expect(
      getByText(
        'Congrats! You are logged as the first administrator. To discover the powerful features provided by Strapi, we recommend you to create your first Content type!'
      )
    ).toBeInTheDocument();
    expect(getByRole('button', { name: 'Create your first Content type' })).toBeInTheDocument();
  });

  it('should display particular text and action when there are collectionTypes and singletypes', () => {
    useModels.mockImplementation(() => ({
      isLoading: false,
      collectionTypes: [{ uuid: 102 }],
      singleTypes: [{ isDisplayed: true }],
    }));

    const { getByText, getByRole } = render(App);

    expect(
      getByText(
        'We hope you are making progress on your project! Feel free to read the latest news about Strapi. We are giving our best to improve the product based on your feedback.'
      )
    ).toBeInTheDocument();
    expect(getByRole('link', { name: 'See more on the blog' })).toBeInTheDocument();
  });
});
