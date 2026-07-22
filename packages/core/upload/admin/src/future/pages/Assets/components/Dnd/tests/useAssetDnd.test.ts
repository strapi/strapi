import { renderHook } from '@testing-library/react';

import { useFileDraggable, useFolderDraggableDroppable } from '../useAssetDnd';
import { useFolderTreeDroppable } from '../useFolderTreeDroppable';

const mockUseDraggable = jest.fn();
const mockUseDroppable = jest.fn();
const mockUseDndContext = jest.fn();
const mockIsValidDropTarget = jest.fn();
const mockUseGetFolderStructureQuery = jest.fn();

jest.mock('@dnd-kit/core', () => ({
  useDraggable: (config: unknown) => mockUseDraggable(config),
  useDroppable: (config: unknown) => mockUseDroppable(config),
  useDndContext: () => mockUseDndContext(),
}));

jest.mock('../AssetsDndProvider', () => ({
  useAssetsDndOptional: () => ({
    isMovePending: false,
    isValidDropTarget: mockIsValidDropTarget,
  }),
}));

jest.mock('../../../../../services/folders', () => ({
  useGetFolderStructureQuery: () => mockUseGetFolderStructureQuery(),
}));

describe('useFileDraggable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      isDragging: false,
    });
  });

  it('uses folder id from a populated folder relation object', () => {
    renderHook(() =>
      useFileDraggable({
        id: 10,
        name: 'hero.png',
        folder: { id: 5 },
      })
    );

    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          kind: 'file',
          id: 10,
          name: 'hero.png',
          folderId: 5,
        },
      })
    );
  });

  it('uses null folderId when folder is null', () => {
    renderHook(() =>
      useFileDraggable({
        id: 10,
        name: 'hero.png',
        folder: null,
      })
    );

    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ folderId: null }),
      })
    );
  });

  it('uses numeric folder id directly', () => {
    renderHook(() =>
      useFileDraggable({
        id: 10,
        name: 'hero.png',
        folder: 7,
      })
    );

    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ folderId: 7 }),
      })
    );
  });
});

describe('provider-owned drop validity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDndContext.mockReturnValue({ active: { id: 'file:1' } });
    mockUseDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      isDragging: false,
    });
    mockUseDroppable.mockReturnValue({
      setNodeRef: jest.fn(),
      isOver: true,
    });
    mockIsValidDropTarget.mockReturnValue(true);
  });

  it('uses centralized validity for in-view folder targets without fetching structure', () => {
    const { result } = renderHook(() =>
      useFolderDraggableDroppable({ id: 2, name: '2023', parent: 1 })
    );

    expect(mockUseGetFolderStructureQuery).not.toHaveBeenCalled();
    expect(mockIsValidDropTarget).toHaveBeenCalledWith(2);
    expect(result.current.showValidDropHighlight).toBe(true);
  });

  it('uses centralized validity for sidebar tree targets without fetching structure', () => {
    const { result } = renderHook(() => useFolderTreeDroppable({ id: 2, name: '2023' }));

    expect(mockUseGetFolderStructureQuery).not.toHaveBeenCalled();
    expect(mockIsValidDropTarget).toHaveBeenCalledWith(2);
    expect(result.current.showValidDropHighlight).toBe(true);
  });

  it('marks Home via null destination in the centralized lookup', () => {
    mockIsValidDropTarget.mockReturnValue(false);

    const { result } = renderHook(() => useFolderTreeDroppable({ id: null, name: 'Home' }));

    expect(mockIsValidDropTarget).toHaveBeenCalledWith(null);
    expect(result.current.showValidDropHighlight).toBe(false);
    expect(result.current.showInvalidDropCursor).toBe(true);
  });
});
