import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { render, screen, fireEvent } from '@testing-library/react';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import FormModalNavigationProvider from '../../FormModalNavigationProvider';
import AttributeOptions from '../index';

const mockCustomField = {
  'plugin::mycustomfields.test': {
    name: 'color',
    pluginId: 'mycustomfields',
    type: 'text',
    icon: jest.fn(),
    intlLabel: {
      id: 'mycustomfields.color.label',
      defaultMessage: 'Color',
    },
    intlDescription: {
      id: 'mycustomfields.color.description',
      defaultMessage: 'Select any color',
    },
    components: {
      Input: jest.fn(),
    },
  },
};

const getAll = jest.fn().mockReturnValue({});
jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCustomFields: () => ({
    get: jest.fn().mockReturnValue(mockCustomField),
    getAll,
  }),
}));

const mockAttributes = [
  [
    'text',
    'email',
    'richtext',
    'password',
    'number',
    'enumeration',
    'date',
    'media',
    'boolean',
    'json',
    'relation',
    'uid',
  ],
  ['component', 'dynamiczone'],
];

const makeApp = () => {
  const history = createMemoryHistory();

  return (
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <FormModalNavigationProvider>
            <AttributeOptions
              attributes={mockAttributes}
              forTarget="contentType"
              kind="collectionType"
            />
          </FormModalNavigationProvider>
        </Router>
      </ThemeProvider>
    </IntlProvider>
  );
};

describe('<AttributeOptions />', () => {
  it('renders and matches the snapshot', () => {
    const App = makeApp();
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });

  it('shows the simple tabs', () => {
    const App = makeApp();
    render(App);

    const defaultTab = screen.getByRole('tab', { selected: true, name: 'Default' });
    const customTab = screen.getByRole('tab', { selected: false, name: 'Custom' });

    expect(defaultTab).toBeVisible();
    expect(customTab).toBeVisible();
  });

  it('defaults to the default tab', () => {
    const App = makeApp();
    render(App);

    const comingSoonText = screen.queryByText('Nothing in here yet.');

    expect(comingSoonText).toEqual(null);
  });

  it('switches to the custom tab without custom fields', () => {
    const App = makeApp();
    render(App);

    getAll.mockReturnValueOnce({});

    const customTab = screen.getByRole('tab', { selected: false, name: 'Custom' });
    fireEvent.click(customTab);
    const customTabSelected = screen.getByRole('tab', { selected: true, name: 'Custom' });
    const comingSoonText = screen.getByText('Nothing in here yet.');

    expect(customTabSelected).toBeVisible();
    expect(comingSoonText).toBeVisible();
  });

  it('switches to the custom tab with custom fields', () => {
    getAll.mockReturnValue(mockCustomField);
    const App = makeApp();
    render(App);

    const customTab = screen.getByRole('tab', { selected: false, name: 'Custom' });
    fireEvent.click(customTab);
    const customTabSelected = screen.getByRole('tab', { selected: true, name: 'Custom' });
    const customFieldText = screen.getByText('Color');
    const howToAddLink = screen.getByRole('link', { name: 'How to add custom fields' });

    expect(customTabSelected).toBeVisible();
    expect(customFieldText).toBeVisible();
    expect(howToAddLink).toBeVisible();
  });
});
