import React from 'react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { FolderList } from '../FolderList';

const FIXTURE_FOLDERS = [
  {
    id: 1,
    pathId: 1,
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
    pathId: 2,
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
const ComponentFixture = (props = { onSelectFolder: jest.fn(), onEditFolder: jest.fn() }) => {
  return (
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <FolderList {...props} />
        </ThemeProvider>
      </IntlProvider>
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

  test('renders with size=small', () => {
    const { container } = setup({
      folders: FIXTURE_FOLDERS,
      size: 'S',
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

  test('does call onChangeFolder', () => {
    const spy = jest.fn();
    const { getByText } = setup({
      folders: FIXTURE_FOLDERS,
      onChangeFolder: spy,
    });

    const folder1 = getByText(FIXTURE_FOLDERS[0].name);

    act(() => {
      fireEvent.click(folder1);
    });

    expect(spy).toHaveBeenCalledWith(1);
  });

  test('does call onEditFolder', () => {
    const spy = jest.fn();
    const { container } = setup({
      folders: FIXTURE_FOLDERS,
      onEditFolder: spy,
    });

    const folder1 = container.querySelector('button[aria-label="Edit folder"]');

    act(() => {
      fireEvent.click(folder1);
    });

    expect(spy).toHaveBeenCalledWith(FIXTURE_FOLDERS[0]);
  });

  test('does call onSelectFolder', () => {
    const spy = jest.fn();
    const { container } = setup({
      folders: FIXTURE_FOLDERS,
      onSelectFolder: spy,
    });

    const folder1 = container.querySelector('input[type="checkbox"]');

    act(() => {
      fireEvent.click(folder1);
    });

    expect(spy).toHaveBeenCalledWith({
      ...FIXTURE_FOLDERS[0],
      type: 'folder',
    });
  });
});
