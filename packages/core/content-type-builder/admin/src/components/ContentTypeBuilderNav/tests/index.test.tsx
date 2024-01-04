/* eslint-disable check-file/filename-naming-convention */
import { Layout, lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { ContentTypeBuilderNav } from '../ContentTypeBuilderNav';

import { mockData } from './mockData';

jest.mock('../useContentTypeBuilderMenu.ts', () => {
  return {
    useContentTypeBuilderMenu: jest.fn(() => ({
      menu: mockData,
      searchValue: '',
      onSearchChange() {},
    })),
  };
});

const makeApp = () => {
  return (
    <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <Layout sideNav={<ContentTypeBuilderNav />}>
            <div />
          </Layout>
        </MemoryRouter>
      </ThemeProvider>
    </IntlProvider>
  );
};

describe('<ContentTypeBuilderNav />', () => {
  it('renders and matches the snapshot', () => {
    const App = makeApp();
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });
});
