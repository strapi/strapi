import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { render, screen, getByText, fireEvent } from '@testing-library/react';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import FormModalNavigationProvider from '../../FormModalNavigationProvider';
import AttributeOptions from '../index';

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

    const defaultTab = screen.getByRole('tab', { selected: true });
    const customTab = screen.getByRole('tab', { selected: false });

    expect(defaultTab).toBeVisible();
    expect(customTab).toBeVisible();
  });

  it('defaults to the default tab', () => {
    const App = makeApp();
    render(App);

    const comingSoonText = screen.queryByText('Nothing in here yet.');

    expect(comingSoonText).toEqual(null);
  });

  it('switches to the custom tab', () => {
    const App = makeApp();
    render(App);

    const customTab = screen.getByRole('tab', { selected: false });
    fireEvent.click(customTab);
    const customTabSelected = screen.getByRole('tab', { selected: true });
    const customTabText = getByText(customTabSelected, 'Custom');
    const comingSoonText = screen.getByText('Nothing in here yet.');

    expect(customTabText).not.toBe(null);
    expect(comingSoonText).toBeVisible();
  });
});
