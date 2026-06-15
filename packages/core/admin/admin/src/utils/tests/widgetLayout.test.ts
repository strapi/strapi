import {
  isValidWidgetWidth,
  isValidResizeOperation,
  getWidgetWidth,
  calculateWidgetRows,
  moveWidgetInArray,
  findRowContainingWidget,
  resizeRowAfterRemoval,
  resizeRowAfterAddition,
  isLastWidgetInRow,
  canResizeBetweenWidgets,
  createDefaultWidgetWidths,
} from '../widgetLayout';

import type { WidgetWithUID } from '../../core/apis/Widgets';

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
  createMockWidget('widget-4', 'Widget 4'),
];

const mockColumnWidths = {
  'widget-1': 6,
  'widget-2': 6,
  'widget-3': 12,
  'widget-4': 4,
};

// Mock row data for testing
const mockRows = [
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

const mockRow = {
  widgets: [mockWidgets[0], mockWidgets[1]],
  totalWidth: 12,
  startIndex: 0,
  endIndex: 1,
};

const mockEmptyRow = {
  widgets: [],
  totalWidth: 0,
  startIndex: 0,
  endIndex: -1,
};

describe('isValidWidgetWidth', () => {
  it('should validate widget widths correctly', () => {
    expect(isValidWidgetWidth(4)).toBe(true);
    expect(isValidWidgetWidth(6)).toBe(true);
    expect(isValidWidgetWidth(12)).toBe(true);
    expect(isValidWidgetWidth(1)).toBe(false);
    expect(isValidWidgetWidth(13)).toBe(false);
  });
});

describe('isValidResizeOperation', () => {
  it('should return true for valid resize operations', () => {
    expect(isValidResizeOperation(6, 6)).toBe(true);
    expect(isValidResizeOperation(4, 8)).toBe(true);
    expect(isValidResizeOperation(8, 4)).toBe(true);
  });
});

describe('getWidgetWidth', () => {
  it('should return correct widget widths', () => {
    expect(getWidgetWidth(mockColumnWidths, 'widget-1')).toBe(6);
    expect(getWidgetWidth(mockColumnWidths, 'non-existent')).toBe(6);
  });
});

describe('calculateWidgetRows', () => {
  it('should calculate rows correctly', () => {
    const columnWidths = { 'widget-1': 6, 'widget-2': 6, 'widget-3': 12 };
    const result = calculateWidgetRows(
      [mockWidgets[0], mockWidgets[1], mockWidgets[2]],
      columnWidths
    );

    expect(result).toHaveLength(2);
    expect(result[0].widgets).toEqual([mockWidgets[0], mockWidgets[1]]);
    expect(result[1].widgets).toEqual([mockWidgets[2]]);
  });
});

describe('moveWidgetInArray', () => {
  it('should move widget to new position', () => {
    const result = moveWidgetInArray(mockWidgets, 'widget-1', 2);
    expect(result).toHaveLength(4);
    expect(result[0].uid).toBe('widget-2');
    expect(result[1].uid).toBe('widget-1');
    expect(result[2].uid).toBe('widget-3');
    expect(result[3].uid).toBe('widget-4');
  });

  it('should handle moving to end of array', () => {
    const result = moveWidgetInArray(mockWidgets, 'widget-1', mockWidgets.length - 1);
    expect(result).toHaveLength(4);
    expect(result[3].uid).toBe('widget-4');
  });
});

describe('findRowContainingWidget', () => {
  it('should find rows correctly', () => {
    expect(findRowContainingWidget(mockRows, 'widget-1', mockWidgets)).toEqual(mockRows[0]);
    expect(findRowContainingWidget(mockRows, 'non-existent', mockWidgets)).toBeUndefined();
  });
});

describe('resizeRowAfterRemoval', () => {
  it('should resize rows after removal', () => {
    const columnWidths = { 'widget-1': 6, 'widget-2': 6 };
    const result = resizeRowAfterRemoval(mockRow, 'widget-1', columnWidths);
    expect(result['widget-2']).toBe(12);
  });
});

describe('resizeRowAfterAddition', () => {
  it('should resize row after widget addition', () => {
    const columnWidths = { 'widget-1': 12 };
    const result = resizeRowAfterAddition(mockRow, mockWidgets[1], 1, columnWidths);

    expect(result['widget-1']).toBe(6);
    expect(result['widget-2']).toBe(6);
  });

  it('should handle adding widget to empty row', () => {
    const result = resizeRowAfterAddition(mockEmptyRow, mockWidgets[0], 0, {});

    expect(result['widget-1']).toBe(12);
  });
});

describe('isLastWidgetInRow', () => {
  it('should identify last widget in row', () => {
    const columnWidths = { 'widget-1': 6, 'widget-2': 6, 'widget-3': 12 };
    expect(isLastWidgetInRow(1, mockWidgets, columnWidths)).toBe(true);
    expect(isLastWidgetInRow(0, mockWidgets, columnWidths)).toBe(false);
  });
});

describe('canResizeBetweenWidgets', () => {
  it('should check resize capability correctly', () => {
    const columnWidths = { 'widget-1': 6, 'widget-2': 6, 'widget-3': 12 };
    expect(canResizeBetweenWidgets('widget-1', 'widget-2', columnWidths, mockWidgets)).toBe(true);
    expect(canResizeBetweenWidgets('widget-2', 'widget-3', columnWidths, mockWidgets)).toBe(false);
  });
});

describe('createDefaultWidgetWidths', () => {
  it('should create default widths for widgets', () => {
    const result = createDefaultWidgetWidths(mockWidgets);

    // With 4 widgets (even count), all get width 6
    expect(result).toEqual({
      'widget-1': 6,
      'widget-2': 6,
      'widget-3': 6,
      'widget-4': 6,
    });
  });

  it('should handle empty widgets array', () => {
    const result = createDefaultWidgetWidths([]);
    expect(result).toEqual({});
  });

  it('should handle odd count widgets', () => {
    const oddWidgets = [mockWidgets[0], mockWidgets[1], mockWidgets[2]]; // 3 widgets
    const result = createDefaultWidgetWidths(oddWidgets);

    // With 3 widgets (odd count), first two get 6, last gets 12
    expect(result).toEqual({
      'widget-1': 6,
      'widget-2': 6,
      'widget-3': 12,
    });
  });
});
