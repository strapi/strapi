import { addVerticalDropZones, addHorizontalDropZones, DROP_ZONE_SIZE } from '../GapDropZone';

import type { WidgetWithUID } from '../../core/apis/Widgets';
import type { WidgetRow } from '../../utils/widgetLayout';

// Mock data
const createMockWidget = (uid: string, title: string): WidgetWithUID => ({
  uid: uid as any,
  title: { defaultMessage: title, id: `test.${uid}` },
  icon: undefined,
  component: () => Promise.resolve(() => null),
});

const mockWidgets: WidgetWithUID[] = [
  createMockWidget('plugin::test.widget-1', 'Widget 1'),
  createMockWidget('plugin::test.widget-2', 'Widget 2'),
  createMockWidget('plugin::test.widget-3', 'Widget 3'),
];

const mockRow: WidgetRow = {
  widgets: [mockWidgets[0], mockWidgets[1]],
  totalWidth: 12,
  startIndex: 0,
  endIndex: 1,
};

// Mock DOM element
const mockElement = {
  getBoundingClientRect: () => ({
    top: 100,
    left: 0,
    height: 200,
    width: 150,
    bottom: 300,
    right: 150,
  }),
} as unknown as HTMLElement;

const mockRowInfo = {
  firstWidgetElement: mockElement,
  lastWidgetElement: mockElement,
  containerElement: mockElement,
  firstRect: {
    top: 100,
    left: 0,
    height: 200,
    width: 300,
    bottom: 300,
    right: 300,
    x: 0,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect,
  lastRect: {
    top: 100,
    left: 150,
    height: 200,
    width: 150,
    bottom: 300,
    right: 300,
    x: 150,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect,
  containerRect: {
    top: 0,
    left: 0,
    height: 400,
    width: 300,
    bottom: 400,
    right: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect,
  rowHeight: 200,
  rowTop: 100,
};

describe('addVerticalDropZones', () => {
  it('should return empty array when rowInfo is null', () => {
    const result = addVerticalDropZones(mockRow, null, 0);
    expect(result).toEqual([]);
  });

  it('should return empty array when widget positions cannot be found', () => {
    // Mock document.querySelector to return null
    const originalQuerySelector = document.querySelector;
    document.querySelector = () => null;

    const result = addVerticalDropZones(mockRow, mockRowInfo, 0);
    expect(result).toEqual([]);

    // Restore original
    document.querySelector = originalQuerySelector;
  });

  it('should create drop zones for single widget row', () => {
    const singleWidgetRow: WidgetRow = {
      widgets: [mockWidgets[0]],
      totalWidth: 12,
      startIndex: 0,
      endIndex: 0,
    };

    // Mock document.querySelector to return mock element
    const originalQuerySelector = document.querySelector;
    document.querySelector = () => mockElement;

    const result = addVerticalDropZones(singleWidgetRow, mockRowInfo, 0);

    expect(result).toHaveLength(2); // Before and after the single widget
    expect(result[0]).toMatchObject({
      insertIndex: 0,
      type: 'vertical',
      targetRowIndex: 0,
    });
    expect(result[1]).toMatchObject({
      insertIndex: 1,
      type: 'vertical',
      targetRowIndex: 0,
    });

    // Restore original
    document.querySelector = originalQuerySelector;
  });

  it('should create drop zones for multiple widget row', () => {
    // Mock document.querySelector to return mock element
    const originalQuerySelector = document.querySelector;
    document.querySelector = () => mockElement;

    const result = addVerticalDropZones(mockRow, mockRowInfo, 0);

    expect(result).toHaveLength(3); // Before, between, and after widgets
    expect(result[0]).toMatchObject({
      insertIndex: 0,
      type: 'vertical',
      targetRowIndex: 0,
    });
    expect(result[1]).toMatchObject({
      insertIndex: 1,
      type: 'vertical',
      targetRowIndex: 0,
    });
    expect(result[2]).toMatchObject({
      insertIndex: 2,
      type: 'vertical',
      targetRowIndex: 0,
    });

    // Restore original
    document.querySelector = originalQuerySelector;
  });
});

describe('addHorizontalDropZones', () => {
  it('should return empty array when rowInfo is null', () => {
    const result = addHorizontalDropZones(mockRow, 0, null, [mockRow], mockWidgets);
    expect(result).toEqual([]);
  });

  it('should return empty array for single row with single widget', () => {
    const singleWidgetRow: WidgetRow = {
      widgets: [mockWidgets[0]],
      totalWidth: 12,
      startIndex: 0,
      endIndex: 0,
    };

    const result = addHorizontalDropZones(
      singleWidgetRow,
      0,
      mockRowInfo,
      [singleWidgetRow],
      mockWidgets
    );
    expect(result).toEqual([]);
  });

  it('should create horizontal drop zones for first row (above and below)', () => {
    const firstRow: WidgetRow = {
      widgets: [mockWidgets[0]],
      totalWidth: 12,
      startIndex: 0,
      endIndex: 0,
    };

    const secondRow: WidgetRow = {
      widgets: [mockWidgets[1]],
      totalWidth: 12,
      startIndex: 1,
      endIndex: 1,
    };

    const widgetRows = [firstRow, secondRow];

    // Mock document.querySelector to return mock element
    const originalQuerySelector = document.querySelector;
    document.querySelector = () => mockElement;

    const result = addHorizontalDropZones(firstRow, 0, mockRowInfo, widgetRows, mockWidgets);

    expect(result).toHaveLength(2); // Above first row and below first row (between rows)

    // First drop zone: above the first row
    expect(result[0]).toMatchObject({
      insertIndex: 0,
      type: 'horizontal',
      isHorizontalDrop: true,
    });
    expect(result[0].position.top).toBe(100 - DROP_ZONE_SIZE); // firstRowTop - height
    expect(result[0].position.width).toBe(300); // containerWidth

    // Second drop zone: below the first row (between rows)
    expect(result[1]).toMatchObject({
      insertIndex: 1, // row.endIndex + 1
      type: 'horizontal',
      isHorizontalDrop: true,
    });
    expect(result[1].position.top).toBe(100 - DROP_ZONE_SIZE); // nextRowTop - height (same as firstRowTop in this case)
    expect(result[1].position.width).toBe(300); // containerWidth

    // Restore original
    document.querySelector = originalQuerySelector;
  });

  it('should create horizontal drop zones for single row with multiple widgets (above and after)', () => {
    const singleRowWithMultipleWidgets: WidgetRow = {
      widgets: [mockWidgets[0], mockWidgets[1]], // Multiple widgets
      totalWidth: 12,
      startIndex: 0,
      endIndex: 1,
    };

    const result = addHorizontalDropZones(
      singleRowWithMultipleWidgets,
      0,
      mockRowInfo,
      [singleRowWithMultipleWidgets],
      mockWidgets
    );

    expect(result).toHaveLength(2); // Above first row AND after last row

    // First drop zone: above the first row (because rowIndex === 0)
    expect(result[0]).toMatchObject({
      insertIndex: 0,
      type: 'horizontal',
      isHorizontalDrop: true,
    });
    expect(result[0].position.top).toBe(100 - DROP_ZONE_SIZE); // firstRowTop - height

    // Second drop zone: after the last row (because it's the last row)
    expect(result[1]).toMatchObject({
      insertIndex: mockWidgets.length, // filteredWidgets.length
      type: 'horizontal',
      isHorizontalDrop: true,
    });
    expect(result[1].position.top).toBe(300); // lastRowBottom
  });
});
