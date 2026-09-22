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

const mockUndo = jest.fn();
const mockRedo = jest.fn();
const mockDiscardAllChanges = jest.fn();

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
    undo: mockUndo,
    redo: mockRedo,
    discardAllChanges: mockDiscardAllChanges,
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
    mockUndo.mockClear();
    mockRedo.mockClear();
    mockDiscardAllChanges.mockClear();
    mockedUseDataManager.mockImplementation(() => mockDataManager({ isModified: true }));

    mockSearchOnChange.mockClear();
  });

  it('renders and matches the snapshot', () => {
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });

  describe('save button', () => {
    it('should render the save button', () => {
      const { getByRole } = render(App);

      const saveButton = getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should be disabled when there are no changes', () => {
      mockedUseDataManager.mockImplementationOnce(() =>
        mockDataManager({
          isModified: false,
          history: {
            undo() {},
          },
        })
      );

      const { getByRole } = render(App);

      const saveButton = getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it.each([true, false])(
      'should be disabled when not in development mode & isModified=%s',
      (isModified) => {
        mockedUseDataManager.mockImplementation(() =>
          mockDataManager({
            isModified,
            history: {
              undo() {},
            },
            isInDevelopmentMode: false,
          })
        );

        const { getByRole } = render(App);

        const saveButton = getByRole('button', { name: /save/i });
        expect(saveButton).toBeDisabled();
      }
    );

    it('should be enabled when there are changes', () => {
      mockedUseDataManager.mockImplementation(() =>
        mockDataManager({
          isModified: true,
          history: {
            undo() {},
          },
        })
      );

      const { getByRole } = render(App);

      const saveButton = getByRole('button', { name: /save/i });
      expect(saveButton).toBeEnabled();
    });
  });

  describe('unde redo discardAllChanges', () => {
    it('should render the undo item', async () => {
      const user = userEvent.setup();
      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      expect(await screen.findByRole('menuitem', { name: /undo/i })).toBeInTheDocument();
    });

    it('should render the redo item', async () => {
      const user = userEvent.setup();

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      expect(await screen.findByRole('menuitem', { name: /redo/i })).toBeInTheDocument();
    });

    it('should render the discard item', async () => {
      const user = userEvent.setup();

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      expect(await screen.findByRole('menuitem', { name: /discard/i })).toBeInTheDocument();
    });

    it('should render the undo item as disabled if not in development mode', async () => {
      const user = userEvent.setup();

      mockedUseDataManager.mockImplementation(() =>
        mockDataManager({
          history: {
            canUndo: true,
            undo: mockUndo,
          },
          isInDevelopmentMode: false,
        })
      );

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const undoItem = await screen.findByRole('menuitem', { name: /undo/i });
      expect(undoItem).toHaveAttribute('data-disabled');
    });

    it('should render the redo item as disabled if not in development mode', async () => {
      const user = userEvent.setup();

      mockedUseDataManager.mockImplementation(() =>
        mockDataManager({
          history: {
            canRedo: true,
            redo: mockRedo,
          },
          isInDevelopmentMode: false,
        })
      );

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const redoItem = await screen.findByRole('menuitem', { name: /redo/i });
      expect(redoItem).toHaveAttribute('data-disabled');
    });

    it('should render the discard item as disabled if not in development mode', async () => {
      const user = userEvent.setup();

      mockedUseDataManager.mockImplementation(() =>
        mockDataManager({
          history: {
            canDiscardAll: true,
            discardAllChanges: mockDiscardAllChanges,
          },
          isInDevelopmentMode: false,
        })
      );

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const discardItem = await screen.findByRole('menuitem', { name: /discard/i });
      expect(discardItem).toHaveAttribute('data-disabled');
    });

    it.each([
      {
        isModified: false,
      },
      {
        isModified: true,
      },
    ])('should enable the undo item when there are changes to undo', async (opts) => {
      const user = userEvent.setup();

      mockedUseDataManager.mockImplementation(() =>
        mockDataManager({
          ...opts,
          history: {
            canUndo: true,
            undo: mockUndo,
          },
          isInDevelopmentMode: true,
        })
      );

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const undoItem = await screen.findByText(/undo/i);
      expect(undoItem).not.toHaveAttribute('data-disabled');
    });

    it.each([
      {
        isModified: false,
      },
      {
        isModified: true,
      },
    ])('should enable the redo item when there are changes to redo', async (opts) => {
      const user = userEvent.setup();

      mockedUseDataManager.mockImplementation(() =>
        mockDataManager({
          ...opts,
          history: {
            canRedo: true,
            redo: mockRedo,
          },
          isInDevelopmentMode: true,
        })
      );

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const redoItem = await screen.findByText(/redo/i);
      expect(redoItem).not.toHaveAttribute('data-disabled');
    });

    it.each([
      {
        isModified: false,
      },
      {
        isModified: true,
      },
    ])('should enable the discard item when there are changes to discard', async (opts) => {
      const user = userEvent.setup();

      mockedUseDataManager.mockImplementation(() =>
        mockDataManager({
          ...opts,
          history: {
            canDiscardAll: true,
            discardAllChanges: mockDiscardAllChanges,
          },
          isInDevelopmentMode: true,
        })
      );

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const discardItem = await screen.findByText(/discard/i);
      expect(discardItem).not.toHaveAttribute('data-disabled');
    });

    it('should open the discard confirmation modal', async () => {
      const user = userEvent.setup();

      const { getByRole } = render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const discardItem = await screen.findByText(/discard/i);
      await user.click(discardItem);

      expect(getByRole('alertdialog')).toBeInTheDocument();
      expect(getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should close the discard confirmation modal', async () => {
      const user = userEvent.setup();

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const discardItem = await screen.findByText(/discard/i);
      await user.click(discardItem);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // test I can't find the dialog anymore
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(mockDiscardAllChanges).not.toHaveBeenCalled();
    });

    it('should call discardChanges after confirm', async () => {
      const user = userEvent.setup();

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });
      await user.click(moreActionsButton);

      const discardItem = await screen.findByText(/discard/i);
      await user.click(discardItem);

      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockDiscardAllChanges).toHaveBeenCalledTimes(1);
    });

    it('should call undoHandler', async () => {
      const user = userEvent.setup();

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });

      await user.click(moreActionsButton);

      const undoButton = await screen.findByText(/undo/i);
      await user.click(undoButton);

      expect(mockUndo).toHaveBeenCalledTimes(1);
    });

    it('should call redoHandler', async () => {
      const user = userEvent.setup();

      render(App);

      const moreActionsButton = screen.getByRole('button', { name: /More actions/i });

      await user.click(moreActionsButton);

      const redoButton = await screen.findByText(/redo/i);

      await user.click(redoButton);

      expect(mockRedo).toHaveBeenCalledTimes(1);
    });
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
