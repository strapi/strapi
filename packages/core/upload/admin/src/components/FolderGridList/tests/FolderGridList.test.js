import React from 'react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { FolderGridList } from '../FolderGridList';

const ComponentFixture = () => {
  return (
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <FolderGridList title="Folder grid list title">Folder grid list children</FolderGridList>
        </ThemeProvider>
      </IntlProvider>
    </MemoryRouter>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('FolderGridList', () => {
  it('renders and match snapshots', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });
});
