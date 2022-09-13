import React from 'react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { FolderList } from '../FolderList';

const ComponentFixture = () => {
  return (
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <FolderList title="Folder list title">Folder list children</FolderList>
        </ThemeProvider>
      </IntlProvider>
    </MemoryRouter>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('FolderList', () => {
  it('renders and match snapshots', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });
});
