import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { FolderList } from '../FolderList';

const FIXTURE_FOLDERS = [
  {
    id: 1,
    uid: 1,
    name: 'Folder 1',
    children: {
      count: 1,
    },
    files: {
      count: 1,
    },
  },

  {
    id: 2,
    uid: 2,
    name: 'Folder 2',
    children: {
      count: 11,
    },
    files: {
      count: 12,
    },
  },
];

// eslint-disable-next-line react/prop-types
const ComponentFixture = props => {
  return (
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <FolderList onSelectFolder={() => {}} onEditFolder={() => {}} {...props} />
      </ThemeProvider>
    </MemoryRouter>
  );
};

const setup = props => render(<ComponentFixture {...props} />);

describe('FolderList', () => {
  test('renders', () => {
    const { container } = setup({
      title: 'List title',
      folders: FIXTURE_FOLDERS,
      selectedFolders: [],
    });
    expect(container).toMatchSnapshot();
  });

  test('does select selected folders', () => {
    const { container } = setup({
      title: 'List title with selected items',
      folders: FIXTURE_FOLDERS,
      selectedFolders: FIXTURE_FOLDERS,
    });
    expect(container).toMatchSnapshot();
  });
});
