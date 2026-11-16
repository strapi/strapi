import { DndContext } from '@dnd-kit/core';
import { act, render, screen } from '@tests/utils';

import { FolderTree } from '../FolderTree';
import { SPRING_LOAD_DELAY_MS } from '../useSpringLoadedExpand';

import type { FolderNode } from '../../../../../../../shared/contracts/folders';

const mockUseGetFolderStructureQuery = jest.fn();

jest.mock('../../../../../services/folders', () => ({
  useGetFolderStructureQuery: (...args: unknown[]) => mockUseGetFolderStructureQuery(...args),
}));

// A real drag can't run in jsdom, so the summary row is reported as hovered by a
// dragged item while every other drop target is not.
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  useDroppable: ({ id }: { id: string }) => ({
    setNodeRef: jest.fn(),
    isOver: id.startsWith('folder-tree-summary:'),
  }),
}));

/** L0 > L1 > … > L5, where L{d} has id 10 + d. */
const buildChain = (): FolderNode[] => {
  let level: FolderNode[] = [];

  for (let d = 5; d >= 0; d -= 1) {
    level = [{ id: 10 + d, name: `L${d}`, children: level }];
  }

  return level;
};

describe('FolderTree — dragging over the summary row', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseGetFolderStructureQuery.mockReturnValue({
      data: buildChain(),
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens it after the spring-load delay, so hidden folders can take the drop', () => {
    render(
      <DndContext>
        <FolderTree currentFolderId={15} onSelectFolder={jest.fn()} />
      </DndContext>
    );

    const summaryRow = screen.getByTestId('folder-tree-hidden-ancestors');
    expect(summaryRow).toHaveAttribute('aria-expanded', 'false');

    act(() => {
      jest.advanceTimersByTime(SPRING_LOAD_DELAY_MS);
    });

    expect(summaryRow).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'L1' })).toBeInTheDocument();
  });
});
