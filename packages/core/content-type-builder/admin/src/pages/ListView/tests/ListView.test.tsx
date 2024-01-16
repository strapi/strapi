import { ReactNode } from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { FormModalNavigationProvider } from '../../../components/FormModalNavigationProvider/FormModalNavigationProvider';
import pluginEn from '../../../translations/en.json';
import { getTrad } from '../../../utils/getTrad';
import ListView from '../ListView';

import mockData from './mockData';

jest.mock('../../../hooks/useDataManager', () => {
  return {
    useDataManager: jest.fn(() => ({
      initialData: mockData,
      modifiedData: mockData,
      isInDevelopmentMode: true,
      isInContentTypeView: true,
      submitData() {},
      toggleModalCancel() {},
    })),
  };
});

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  CheckPermissions: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const makeApp = () => {
  type PluginEnKey = keyof typeof pluginEn;
  const messages: Record<string, any> = {
    en: Object.keys(pluginEn).reduce((acc: Record<string, string>, current) => {
      acc[getTrad(current)] = pluginEn[current as PluginEnKey];

      return acc;
    }, {}),
  };

  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <FormModalNavigationProvider>
          <ListView />
        </FormModalNavigationProvider>
      ),
    },
  ]);

  return (
    <IntlProvider messages={messages} defaultLocale="en" textComponent="span" locale="en">
      <ThemeProvider theme={lightTheme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </IntlProvider>
  );
};

describe('<ListView />', () => {
  it('renders and matches the snapshot', () => {
    const App: any = makeApp();
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });
});
