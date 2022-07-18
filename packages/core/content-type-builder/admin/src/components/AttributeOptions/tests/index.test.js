import { render, screen, getByText, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { lightTheme, darkTheme } from '@strapi/design-system';
import LanguageProvider from '../../../../../../admin/admin/src/components/LanguageProvider';
import Theme from '../../../../../../admin/admin/src/components/Theme';
import ThemeToggleProvider from '../../../../../../admin/admin/src/components/ThemeToggleProvider';
import en from '../../../../../../admin/admin/src/translations/en.json';
import FormModalNavigationProvider from '../../FormModalNavigationProvider';
import pluginEn from '../../../translations/en.json';
import getTrad from '../../../utils/getTrad';
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
  const messages = {
    en: Object.keys(pluginEn).reduce(
      (acc, current) => {
        acc[getTrad(current)] = pluginEn[current];

        return acc;
      },
      { ...en }
    ),
  };

  const localeNames = { en: 'English' };

  return (
    <LanguageProvider messages={messages} localeNames={localeNames}>
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <Router history={history}>
            <FormModalNavigationProvider>
              <AttributeOptions attributes={mockAttributes} />
            </FormModalNavigationProvider>
          </Router>
        </Theme>
      </ThemeToggleProvider>
    </LanguageProvider>
  );
};

describe('AttributeOptions', () => {
  it('renders and matches the snapshot', () => {
    const App = makeApp();
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });

  it('shows the simple tabs', async () => {
    const App = makeApp();
    render(App);

    const tabs = screen.getByLabelText('Attribute type tabs');
    const defaultTab = await getByText(tabs, 'Default');
    const customTab = await getByText(tabs, 'Custom');

    expect(defaultTab).toBeVisible();
    expect(customTab).toBeVisible();
  });

  it('defaults to the default tab', async () => {
    const App = makeApp();
    render(App);

    const comingSoonText = screen.queryByText('Coming soon');

    expect(comingSoonText).toEqual(null);
  });

  it('switches to the custom tab', async () => {
    const App = makeApp();
    render(App);

    const customTab = screen.getByRole('tab', { selected: false });
    fireEvent.click(customTab);
    const button = screen.getByRole('tab', { selected: true });
    const customTabActive = await getByText(button, 'Custom');
    const comingSoonText = screen.getByText('Coming soon');

    expect(customTabActive).not.toBe(null);
    expect(comingSoonText).toBeVisible();
  });
});
