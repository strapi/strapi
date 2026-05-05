import { server } from '@tests/server';
import { waitFor, renderHook, screen } from '@tests/utils';
import { rest } from 'msw';

import {
  calculateWidgetRows,
  moveWidgetInArray,
  findRowContainingWidget,
  resizeRowAfterRemoval,
  resizeRowAfterAddition,
  isValidResizeOperation,
  canResizeBetweenWidgets,
} from '../../utils/widgetLayout';
import { useWidgets } from '../Widgets';

import type { WidgetWithUID } from '../../core/apis/Widgets';

// Mock the widget utilities
jest.mock('../../utils/widgetLayout', () => ({
  ...jest.requireActual('../../utils/widgetLayout'),
  calculateWidgetRows: jest.fn(),
  moveWidgetInArray: jest.fn(),
  findRowContainingWidget: jest.fn(),
  resizeRowAfterRemoval: jest.fn(),
  resizeRowAfterAddition: jest.fn(),
  isValidResizeOperation: jest.fn(),
  canResizeBetweenWidgets: jest.fn(),
}));

// Mock the WidgetRoot component
jest.mock('../../components/WidgetRoot', () => ({
  WidgetRoot: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="widget-root">{children}</div>
  ),
}));

const mockCalculateWidgetRows = calculateWidgetRows as jest.MockedFunction<
  typeof calculateWidgetRows
>;
const mockMoveWidgetInArray = moveWidgetInArray as jest.MockedFunction<typeof moveWidgetInArray>;
const mockFindRowContainingWidget = findRowContainingWidget as jest.MockedFunction<
  typeof findRowContainingWidget
>;
const mockResizeRowAfterRemoval = resizeRowAfterRemoval as jest.MockedFunction<
  typeof resizeRowAfterRemoval
>;
const mockResizeRowAfterAddition = resizeRowAfterAddition as jest.MockedFunction<
  typeof resizeRowAfterAddition
>;
const mockIsValidResizeOperation = isValidResizeOperation as jest.MockedFunction<
  typeof isValidResizeOperation
>;
const mockCanResizeBetweenWidgets = canResizeBetweenWidgets as jest.MockedFunction<
  typeof canResizeBetweenWidgets
>;

// Mock widget data
const createMockWidget = (uid: string, title: string): WidgetWithUID => ({
  uid: uid as `plugin::${string}.${string}` | `global::${string}`,
  title: { id: `widget.${uid}`, defaultMessage: title },
  icon: undefined,
  component: jest.fn(),
});

const mockWidgets: WidgetWithUID[] = [
  createMockWidget('widget-1', 'Widget 1'),
  createMockWidget('widget-2', 'Widget 2'),
  createMockWidget('widget-3', 'Widget 3'),
];

const mockColumnWidths = {
  'widget-1': 6,
  'widget-2': 6,
  'widget-3': 12,
};

const mockWidgetRows = [
  {
    widgets: [mockWidgets[0], mockWidgets[1]],
    totalWidth: 12,
    startIndex: 0,
    endIndex: 1,
  },
  {
    widgets: [mockWidgets[2]],
    totalWidth: 12,
    startIndex: 2,
    endIndex: 2,
  },
];

describe('useWidgets', () => {
  const mockSetFilteredWidgets = jest.fn();
  const defaultProps = {
    filteredWidgets: mockWidgets,
    setFilteredWidgets: mockSetFilteredWidgets,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockCalculateWidgetRows.mockReturnValue(mockWidgetRows);
    mockMoveWidgetInArray.mockImplementation((widgets, widgetId, insertIndex) => {
      const widgetIndex = widgets.findIndex((w) => w.uid === widgetId);
      if (widgetIndex === -1) return widgets;

      const newWidgets = [...widgets];
      const [movedWidget] = newWidgets.splice(widgetIndex, 1);
      newWidgets.splice(insertIndex, 0, movedWidget);
      return newWidgets;
    });
    mockFindRowContainingWidget.mockReturnValue(mockWidgetRows[0]);
    mockResizeRowAfterRemoval.mockReturnValue(mockColumnWidths);
    mockResizeRowAfterAddition.mockReturnValue(mockColumnWidths);
    mockIsValidResizeOperation.mockReturnValue(true);
    mockCanResizeBetweenWidgets.mockReturnValue(true);

    // Setup MSW handlers
    server.use(
      rest.put('/admin/homepage/layout', (req, res, ctx) => {
        return res(ctx.json({ success: true }));
      })
    );
  });

  describe('initialization', () => {
    it('should initialize with empty columnWidths and drag state', () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      expect(result.current.columnWidths).toEqual({});
      expect(result.current.isDraggingWidget).toBe(false);
      expect(result.current.draggedWidgetId).toBeUndefined();
    });
  });

  describe('findWidget', () => {
    it('should find existing widget by uid', () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      const widgetInfo = result.current.findWidget('widget-1');

      expect(widgetInfo.widget).toEqual(mockWidgets[0]);
      expect(widgetInfo.index).toBe(0);
    });

    it('should return undefined widget and -1 index for non-existent widget', () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      const widgetInfo = result.current.findWidget('non-existent');

      expect(widgetInfo.widget).toBeUndefined();
      expect(widgetInfo.index).toBe(-1);
    });
  });

  describe('moveWidget', () => {
    it('should move widget to new position and update state', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.moveWidget('widget-1', 2);
      });

      await waitFor(() => {
        expect(mockMoveWidgetInArray).toHaveBeenCalledWith(mockWidgets, 'widget-1', 2);
      });
      await waitFor(() => {
        expect(mockSetFilteredWidgets).toHaveBeenCalled();
      });
    });

    it('should handle horizontal drop', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.moveWidget('widget-1', 2, 1, true);
      });

      await waitFor(() => {
        expect(mockMoveWidgetInArray).toHaveBeenCalledWith(mockWidgets, 'widget-1', 2);
      });
      await waitFor(() => {
        expect(mockSetFilteredWidgets).toHaveBeenCalled();
      });
    });

    it('should handle vertical drop within same row', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.moveWidget('widget-1', 1, 0, false);
      });

      await waitFor(() => {
        expect(mockMoveWidgetInArray).toHaveBeenCalledWith(mockWidgets, 'widget-1', 1);
      });
      await waitFor(() => {
        expect(mockSetFilteredWidgets).toHaveBeenCalled();
      });
    });
  });

  describe('deleteWidget', () => {
    it('should delete widget and update state', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.deleteWidget('widget-1');
      });

      await waitFor(() => {
        expect(mockCalculateWidgetRows).toHaveBeenCalledWith(mockWidgets, {});
      });
      await waitFor(() => {
        expect(mockSetFilteredWidgets).toHaveBeenCalled();
      });
    });
  });

  describe('addWidget', () => {
    it('should add new widget and update state', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));
      const newWidget = createMockWidget('widget-4', 'Widget 4');

      await waitFor(() => {
        result.current.addWidget(newWidget);
      });

      await waitFor(() => {
        expect(mockSetFilteredWidgets).toHaveBeenCalled();
      });
    });

    it('should not add widget if it already exists', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.addWidget(mockWidgets[0]);
      });

      await waitFor(() => {
        // Should call setFilteredWidgets with the same widgets (no change)
        expect(mockSetFilteredWidgets).toHaveBeenCalledWith(mockWidgets);
      });
    });
  });

  describe('handleWidgetResize', () => {
    it('should resize widgets and update columnWidths', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.handleWidgetResize('widget-1', 'widget-2', 8, 4);
      });

      await waitFor(() => {
        expect(mockCanResizeBetweenWidgets).toHaveBeenCalledWith(
          'widget-1',
          'widget-2',
          {},
          mockWidgets
        );
      });
      await waitFor(() => {
        expect(mockIsValidResizeOperation).toHaveBeenCalledWith(8, 4);
      });
    });

    it('should not resize if widgets cannot be resized', async () => {
      mockCanResizeBetweenWidgets.mockReturnValue(false);
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.handleWidgetResize('widget-1', 'widget-2', 8, 4);
      });

      await waitFor(() => {
        expect(mockIsValidResizeOperation).not.toHaveBeenCalled();
      });
    });

    it('should not resize if operation is invalid', async () => {
      mockIsValidResizeOperation.mockReturnValue(false);
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.handleWidgetResize('widget-1', 'widget-2', 8, 4);
      });

      await waitFor(() => {
        // Should not update columnWidths
        expect(result.current.columnWidths).toEqual({});
      });
    });
  });

  describe('drag state management', () => {
    it('should handle drag start', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.handleDragStart('widget-1');
      });

      expect(result.current.isDraggingWidget).toBe(true);
      expect(result.current.draggedWidgetId).toBe('widget-1');
    });

    it('should handle drag end', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      // Start dragging first
      await waitFor(() => {
        result.current.handleDragStart('widget-1');
      });

      expect(result.current.isDraggingWidget).toBe(true);

      // End dragging
      await waitFor(() => {
        result.current.handleDragEnd();
      });

      expect(result.current.isDraggingWidget).toBe(false);
      expect(result.current.draggedWidgetId).toBeUndefined();
    });
  });

  describe('columnWidths state management', () => {
    it('should update columnWidths when setColumnWidths is called', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.setColumnWidths(mockColumnWidths);
      });

      expect(result.current.columnWidths).toEqual(mockColumnWidths);
    });
  });

  describe('API error handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      server.use(
        rest.put('/admin/homepage/layout', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: { message: 'Server error' } }));
        })
      );

      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.moveWidget('widget-1', 2);
      });

      await waitFor(() => {
        // Should not throw error, just handle it gracefully
        expect(mockSetFilteredWidgets).toHaveBeenCalled();
      });

      // Wait for error notification to prevent act warnings from Sonner
      await screen.findByText('Server error');
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      server.use(
        rest.put('/admin/homepage/layout', (req, res, _ctx) => {
          return res.networkError('Network error');
        })
      );

      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.moveWidget('widget-1', 2);
      });

      await waitFor(() => {
        // Should not throw error, just handle it gracefully
        expect(mockSetFilteredWidgets).toHaveBeenCalled();
      });

      // Wait for error notification to prevent act warnings from Sonner
      await screen.findByText('Network error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty widgets array', () => {
      const { result } = renderHook(() =>
        useWidgets({
          filteredWidgets: [],
          setFilteredWidgets: mockSetFilteredWidgets,
        })
      );

      const widgetInfo = result.current.findWidget('non-existent');
      expect(widgetInfo.widget).toBeUndefined();
      expect(widgetInfo.index).toBe(-1);
    });

    it('should handle moveWidget with non-existent widget', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.moveWidget('non-existent', 1);
      });

      await waitFor(() => {
        // Should not crash and should call setFilteredWidgets with original widgets
        expect(mockSetFilteredWidgets).toHaveBeenCalledWith(mockWidgets);
      });
    });

    it('should handle deleteWidget with non-existent widget', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.deleteWidget('non-existent');
      });

      await waitFor(() => {
        // Should not crash
        expect(mockCalculateWidgetRows).toHaveBeenCalled();
      });
    });

    it('should handle resize with invalid widget IDs', async () => {
      const { result } = renderHook(() => useWidgets(defaultProps));

      await waitFor(() => {
        result.current.handleWidgetResize('invalid-1', 'invalid-2', 8, 4);
      });

      await waitFor(() => {
        expect(mockCanResizeBetweenWidgets).toHaveBeenCalled();
      });
    });
  });
});
