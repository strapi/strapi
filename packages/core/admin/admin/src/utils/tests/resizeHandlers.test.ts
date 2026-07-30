import {
  snapToDiscreteSize,
  adjustToTotalColumns,
  isValidResize,
  getElementRects,
  calculateResizeHandlePosition,
  calculateRowBounds,
  calculateTargetWidths,
  shouldTriggerResize,
} from '../resizeHandlers';

describe('snapToDiscreteSize', () => {
  it('should snap width to nearest discrete size', () => {
    expect(snapToDiscreteSize(3)).toBe(4);
    expect(snapToDiscreteSize(7)).toBe(6);
    expect(snapToDiscreteSize(10)).toBe(8);
    expect(snapToDiscreteSize(15)).toBe(12);
  });
});

describe('adjustToTotalColumns', () => {
  it('should adjust widths correctly', () => {
    const result1 = adjustToTotalColumns(8, 8);
    expect(result1.leftWidth + result1.rightWidth).toBe(12);

    const result2 = adjustToTotalColumns(6, 6);
    expect(result2.leftWidth).toBe(6);
    expect(result2.rightWidth).toBe(6);
  });
});

describe('isValidResize', () => {
  it('should validate resize operations correctly', () => {
    expect(isValidResize(6, 6)).toBe(true);
    expect(isValidResize(4, 8)).toBe(true);
    expect(isValidResize(5, 6)).toBe(false);
    expect(isValidResize(8, 8)).toBe(false);
  });
});

describe('getElementRects', () => {
  it('should return null when any element is missing', () => {
    const mockElement = { getBoundingClientRect: jest.fn() } as unknown as Element;

    expect(getElementRects(null, mockElement, mockElement)).toBeNull();
    expect(getElementRects(mockElement, null, mockElement)).toBeNull();
    expect(getElementRects(mockElement, mockElement, null)).toBeNull();
  });

  it('should return rects when all elements are provided', () => {
    const mockLeftRect = { left: 0, right: 100, top: 0, height: 50 };
    const mockRightRect = { left: 100, right: 200, top: 0, height: 50 };
    const mockContainerRect = { left: 0, right: 200, top: 0, height: 50 };

    const mockLeftElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockLeftRect),
    } as unknown as Element;
    const mockRightElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockRightRect),
    } as unknown as Element;
    const mockContainerElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockContainerRect),
    } as unknown as Element;

    const result = getElementRects(mockLeftElement, mockRightElement, mockContainerElement);

    expect(result).toEqual({
      leftRect: mockLeftRect,
      rightRect: mockRightRect,
      containerRect: mockContainerRect,
    });
  });
});

describe('calculateResizeHandlePosition', () => {
  it('should return default position when elements are missing', () => {
    const result = calculateResizeHandlePosition(null, null, null);
    expect(result).toEqual({ left: 0, top: 0, height: 0 });
  });

  it('should calculate correct resize handle position', () => {
    const mockLeftRect = { left: 0, right: 100, top: 10, height: 50 };
    const mockRightRect = { left: 100, right: 200, top: 10, height: 60 };
    const mockContainerRect = { left: 0, right: 200, top: 0, height: 100 };

    const mockLeftElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockLeftRect),
    } as unknown as Element;
    const mockRightElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockRightRect),
    } as unknown as Element;
    const mockContainerElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockContainerRect),
    } as unknown as Element;

    const result = calculateResizeHandlePosition(
      mockLeftElement,
      mockRightElement,
      mockContainerElement
    );

    expect(result).toEqual({
      left: 100, // leftRect.right - containerRect.left
      top: 10, // leftRect.top - containerRect.top
      height: 60, // Math.max(leftRect.height, rightRect.height)
    });
  });
});

describe('calculateRowBounds', () => {
  it('should return null when elements are missing', () => {
    const result = calculateRowBounds(null, null, null);
    expect(result).toBeNull();
  });

  it('should calculate correct row bounds', () => {
    const mockLeftRect = { left: 50, right: 100, top: 10, height: 50 };
    const mockRightRect = { left: 100, right: 150, top: 10, height: 60 };
    const mockContainerRect = { left: 0, right: 200, top: 0, height: 100 };

    const mockLeftElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockLeftRect),
    } as unknown as Element;
    const mockRightElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockRightRect),
    } as unknown as Element;
    const mockContainerElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockContainerRect),
    } as unknown as Element;

    const result = calculateRowBounds(mockLeftElement, mockRightElement, mockContainerElement);

    expect(result).toEqual({
      left: 50, // Math.min(leftRect.left, rightRect.left) - containerRect.left
      top: 10, // leftRect.top - containerRect.top
      width: 100, // Math.max(leftRect.right, rightRect.right) - Math.min(leftRect.left, rightRect.left)
      height: 60, // Math.max(leftRect.height, rightRect.height)
    });
  });

  it('should handle overlapping elements', () => {
    const mockLeftRect = { left: 100, right: 150, top: 10, height: 50 };
    const mockRightRect = { left: 50, right: 100, top: 10, height: 60 };
    const mockContainerRect = { left: 0, right: 200, top: 0, height: 100 };

    const mockLeftElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockLeftRect),
    } as unknown as Element;
    const mockRightElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockRightRect),
    } as unknown as Element;
    const mockContainerElement = {
      getBoundingClientRect: jest.fn().mockReturnValue(mockContainerRect),
    } as unknown as Element;

    const result = calculateRowBounds(mockLeftElement, mockRightElement, mockContainerElement);

    expect(result).toEqual({
      left: 50, // Math.min(100, 50) - 0
      top: 10, // 10 - 0
      width: 100, // Math.max(150, 100) - Math.min(100, 50) = 150 - 50
      height: 60, // Math.max(50, 60)
    });
  });
});

describe('calculateTargetWidths', () => {
  it('should calculate target widths correctly for positive delta', () => {
    const result = calculateTargetWidths(2, 4, 8);
    expect(result.targetLeftWidth).toBe(6);
    expect(result.targetRightWidth).toBe(6);
    expect(result.targetLeftWidth + result.targetRightWidth).toBe(12);
  });

  it('should calculate target widths correctly for negative delta', () => {
    const result = calculateTargetWidths(-2, 8, 4);
    expect(result.targetLeftWidth).toBe(6);
    expect(result.targetRightWidth).toBe(6);
    expect(result.targetLeftWidth + result.targetRightWidth).toBe(12);
  });

  it('should snap to discrete sizes', () => {
    const result = calculateTargetWidths(1, 5, 7);
    expect(result.targetLeftWidth).toBe(6); // 5+1=6, snaps to 6
    expect(result.targetRightWidth).toBe(6); // 7-1=6, snaps to 6
  });

  it('should maintain total columns constraint', () => {
    const result = calculateTargetWidths(3, 6, 6);
    expect(result.targetLeftWidth + result.targetRightWidth).toBe(12);
  });

  it('should handle edge case with minimum widths', () => {
    const result = calculateTargetWidths(-1, 4, 8);
    expect(result.targetLeftWidth).toBe(4); // Minimum width
    expect(result.targetRightWidth).toBe(8); // Adjusted to maintain total
  });
});

describe('shouldTriggerResize', () => {
  it('should return true when left width changes', () => {
    const lastResizeValues = { leftWidth: 6, rightWidth: 6 };
    expect(shouldTriggerResize(8, 4, lastResizeValues)).toBe(true);
  });

  it('should return true when right width changes', () => {
    const lastResizeValues = { leftWidth: 6, rightWidth: 6 };
    expect(shouldTriggerResize(6, 8, lastResizeValues)).toBe(true);
  });

  it('should return true when both widths change', () => {
    const lastResizeValues = { leftWidth: 6, rightWidth: 6 };
    expect(shouldTriggerResize(8, 4, lastResizeValues)).toBe(true);
  });

  it('should return false when widths are the same', () => {
    const lastResizeValues = { leftWidth: 6, rightWidth: 6 };
    expect(shouldTriggerResize(6, 6, lastResizeValues)).toBe(false);
  });

  it('should return false when only one width is the same', () => {
    const lastResizeValues = { leftWidth: 6, rightWidth: 6 };
    expect(shouldTriggerResize(6, 4, lastResizeValues)).toBe(true); // Right changed
    expect(shouldTriggerResize(8, 6, lastResizeValues)).toBe(true); // Left changed
  });
});
