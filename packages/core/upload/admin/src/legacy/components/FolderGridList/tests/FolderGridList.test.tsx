import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { FolderGridList } from '../FolderGridList';

const ComponentFixture = () => {
  return (
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}}>
        <DesignSystemProvider>
          <FolderGridList title="Folder grid list title">Folder grid list children</FolderGridList>
        </DesignSystemProvider>
      </IntlProvider>
    </MemoryRouter>
  );
};

const setup = () => render(<ComponentFixture />);

describe('FolderGridList', () => {
  it('renders and match snapshots', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });
});
