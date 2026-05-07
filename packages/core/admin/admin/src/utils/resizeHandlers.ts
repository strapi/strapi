/**
 * These functions handle DOM element positioning, bounding rect calculations, and resize-specific logic.
 */

import { WIDGET_SIZING } from './widgetLayout';

/**
 * Snaps a width value to the nearest discrete size
 */
export const snapToDiscreteSize = (width: number): number => {
  return WIDGET_SIZING.DISCRETE_SIZES.reduce((prev, curr) =>
    Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev
  );
};

/**
 * Ensures two widths sum to exactly 12 columns by adjusting the right width
 */
export const adjustToTotalColumns = (
  leftWidth: number,
  rightWidth: number
): { leftWidth: number; rightWidth: number } => {
  const totalWidth = leftWidth + rightWidth;
  if (totalWidth !== WIDGET_SIZING.TOTAL_COLUMNS) {
    const difference = WIDGET_SIZING.TOTAL_COLUMNS - totalWidth;
    rightWidth += difference;
  }
  return { leftWidth, rightWidth };
};

/**
 * Validates if two widget widths together are valid (sum to 12 columns)
 */
export const isValidResize = (leftWidth: number, rightWidth: number): boolean => {
  return (
    leftWidth >= WIDGET_SIZING.MIN_WIDGET_WIDTH &&
    rightWidth >= WIDGET_SIZING.MIN_WIDGET_WIDTH &&
    leftWidth + rightWidth === WIDGET_SIZING.TOTAL_COLUMNS
  );
};

/**
 * Get bounding rects for all elements
 */
export const getElementRects = (
  leftElement: Element | null,
  rightElement: Element | null,
  containerElement: Element | null
) => {
  if (!leftElement || !rightElement || !containerElement) {
    return null;
  }

  return {
    leftRect: leftElement.getBoundingClientRect(),
    rightRect: rightElement.getBoundingClientRect(),
    containerRect: containerElement.getBoundingClientRect(),
  };
};

/**
 * Calculate resize handle position from DOM elements
 */
export const calculateResizeHandlePosition = (
  leftElement: Element | null,
  rightElement: Element | null,
  containerElement: Element | null
) => {
  const rects = getElementRects(leftElement, rightElement, containerElement);
  if (!rects) {
    return { left: 0, top: 0, height: 0 };
  }

  const { leftRect, rightRect, containerRect } = rects;

  const left = leftRect.right - containerRect.left;
  const top = leftRect.top - containerRect.top;
  const height = Math.max(leftRect.height, rightRect.height);

  return { left, top, height };
};

/**
 * Calculate row bounds for resize indicator from DOM elements
 */
export const calculateRowBounds = (
  leftElement: Element | null,
  rightElement: Element | null,
  containerElement: Element | null
) => {
  const rects = getElementRects(leftElement, rightElement, containerElement);
  if (!rects) {
    return null;
  }

  const { leftRect, rightRect, containerRect } = rects;

  const rowLeft = Math.min(leftRect.left, rightRect.left) - containerRect.left;
  const rowTop = leftRect.top - containerRect.top;
  const rowWidth =
    Math.max(leftRect.right, rightRect.right) - Math.min(leftRect.left, rightRect.left);
  const rowHeight = Math.max(leftRect.height, rightRect.height);

  return { left: rowLeft, top: rowTop, width: rowWidth, height: rowHeight };
};

/**
 * Calculates target widths for a resize operation based on delta movement
 */
export const calculateTargetWidths = (
  deltaColumns: number,
  startLeftWidth: number,
  startRightWidth: number
): { targetLeftWidth: number; targetRightWidth: number } => {
  let targetLeftWidth = startLeftWidth + deltaColumns;
  let targetRightWidth = startRightWidth - deltaColumns;

  targetLeftWidth = snapToDiscreteSize(targetLeftWidth);
  targetRightWidth = snapToDiscreteSize(targetRightWidth);

  // Adjust to maintain total columns constraint
  const adjusted = adjustToTotalColumns(targetLeftWidth, targetRightWidth);
  return { targetLeftWidth: adjusted.leftWidth, targetRightWidth: adjusted.rightWidth };
};

/**
 * Determines if a resize operation should trigger based on value changes
 * Used for performance optimization to prevent unnecessary updates
 */
export const shouldTriggerResize = (
  leftWidth: number,
  rightWidth: number,
  lastResizeValues: { leftWidth: number; rightWidth: number }
): boolean => {
  return leftWidth !== lastResizeValues.leftWidth || rightWidth !== lastResizeValues.rightWidth;
};
