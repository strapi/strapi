/* eslint-disable check-file/filename-naming-convention */
import { useState } from 'react';

import { render, screen } from '@strapi/admin/strapi-admin/test';
import { userEvent } from '@testing-library/user-event';

import { useDataManager } from '../../DataManager/useDataManager';
import { ContentTypeBuilderNav } from '../ContentTypeBuilderNav';

import { mockData } from './mockData';

import type { DataManagerContextValue } from '../../DataManager/DataManagerContext';

const mockSearchOnChange = jest.fn(); // Spy function

jest.mock('../useContentTypeBuilderMenu.ts', () => {
  return {
    useContentTypeBuilderMenu: jest.fn(() => {
      const [searchValue, setSearchValue] = useState('');

      return {
        menu: mockData,
        search: {
          value: searchValue,
          onChange: (v: string) => {
            setSearchValue(v);
            mockSearchOnChange(v);
          },
        },
      };
    }),
  };
});

type DataManagerMockOptions = Partial<Omit<DataManagerContextValue, 'history'>> & {
  history?: Partial<DataManagerContextValue['history']>;
};

const mockDataManager = ({
  history,
  ...overrides
}: DataManagerMockOptions = {}): DataManagerContextValue => ({
  isLoading: false,
  addAttribute() {},
  editAttribute() {},
  moveAttribute() {},
  addCustomFieldAttribute() {},
  editCustomFieldAttribute() {},
  addCreatedComponentToDynamicZone() {},
  createComponentSchema() {},
  createSchema() {},
  changeDynamicZoneComponents() {},
  removeAttribute() {},
  deleteComponent() {},
  deleteContentType() {},
  removeComponentFromDynamicZone() {},
  sortedContentTypesList: [],
  updateComponentSchema() {},
  updateComponentUid() {},
  updateSchema() {},
  initialComponents: {},
  components: {},
  componentsGroupedByCategory: {},
  componentsThatHaveOtherComponentInTheirAttributes: [],
  initialContentTypes: {},
  contentTypes: {},
  isInDevelopmentMode: true,
  nestedComponents: [],
  reservedNames: {
    models: [],
    attributes: [],
  },
  allComponentsCategories: [],
  async saveSchema() {},
  isModified: false,
  isSaving: false,
  applyChange() {},
  ...overrides,
  history: {
    canUndo: true,
    canRedo: true,
    canDiscardAll: true,
    undo() {},
    redo() {},
    discardAllChanges() {},
    ...history,
  },
});

jest.mock('../../DataManager/useDataManager.ts', () => {
  return {
    useDataManager: jest.fn(() => mockDataManager()),
  };
});

const mockedUseDataManager = jest.mocked(useDataManager);

const App = <ContentTypeBuilderNav />;

describe('<ContentTypeBuilderNav />', () => {
  beforeEach(() => {
    mockedUseDataManager.mockImplementation(() => mockDataManager({ isModified: true }));

    mockSearchOnChange.mockClear();
  });

  it('renders and matches the snapshot', () => {
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });

  describe('search', () => {
    it('should render the search input', () => {
      render(App);

      expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
    });

    it('Should call search.onChange when the input value changes', async () => {
      const user = userEvent.setup();

      render(App);

      const input = screen.getByRole('searchbox', { name: /search/i });
      await user.type(input, 'test');

      expect(input).toHaveValue('test');
      expect(mockSearchOnChange).toHaveBeenCalledTimes(4);
    });

    it('Should clear the search input when the clear button is clicked', async () => {
      const user = userEvent.setup();

      render(App);

      const input = screen.getByRole('searchbox', { name: /search/i });
      await user.type(input, 'test');

      expect(input).toHaveValue('test');

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(input).toHaveValue('');
      expect(mockSearchOnChange).toHaveBeenCalledTimes(5);
    });
  });
});
