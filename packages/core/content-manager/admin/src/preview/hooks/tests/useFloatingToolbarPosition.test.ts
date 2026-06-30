import { renderHook } from '@testing-library/react';
import { Range } from 'slate';
import { ReactEditor, useSlate } from 'slate-react';

import { useFloatingToolbarPosition } from '../useFloatingToolbarPosition';

jest.mock('slate-react', () => ({
  useSlate: jest.fn(),
  ReactEditor: {
    toDOMRange: jest.fn(),
  },
}));

jest.mock('slate', () => ({
  Range: {
    isCollapsed: jest.fn(),
  },
}));

const mockUseSlate = useSlate as jest.Mock;
const mockToDOMRange = ReactEditor.toDOMRange as jest.Mock;
const mockIsCollapsed = Range.isCollapsed as jest.Mock;

const TOOLBAR_HEIGHT = 46;
const TOOLBAR_WIDTH = 400;
const OFFSET = 8;

const makeRect = (overrides: Record<string, number> = {}) => ({
  top: 200,
  bottom: 220,
  left: 400,
  right: 500,
  width: 100,
  height: 20,
  x: 400,
  y: 200,
  toJSON: () => ({}),
  ...overrides,
});

const mockSelection = { anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 5 } };

describe('useFloatingToolbarPosition', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    });

    mockIsCollapsed.mockReturnValue(false);
    mockUseSlate.mockReturnValue({ selection: mockSelection });
    mockToDOMRange.mockReturnValue({
      getBoundingClientRect: jest.fn().mockReturnValue(makeRect()),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns visible: false when there is no selection', () => {
    mockUseSlate.mockReturnValue({ selection: null });

    const { result } = renderHook(() => useFloatingToolbarPosition());

    expect(result.current.visible).toBe(false);
  });

  test('returns visible: false when selection is collapsed', () => {
    mockIsCollapsed.mockReturnValue(true);

    const { result } = renderHook(() => useFloatingToolbarPosition());

    expect(result.current.visible).toBe(false);
  });

  test('returns visible: false when the selection bounding rect is zero-size', () => {
    mockToDOMRange.mockReturnValue({
      getBoundingClientRect: jest.fn().mockReturnValue(makeRect({ width: 0, height: 0 })),
    });

    const { result } = renderHook(() => useFloatingToolbarPosition());

    expect(result.current.visible).toBe(false);
  });

  test('returns visible: false when toDOMRange throws', () => {
    mockToDOMRange.mockImplementation(() => {
      throw new Error('No DOM range');
    });

    const { result } = renderHook(() => useFloatingToolbarPosition());

    expect(result.current.visible).toBe(false);
  });

  test('positions toolbar above selection and sets visible: true when there is enough room', () => {
    // rect.top=200, TOOLBAR_HEIGHT=46, OFFSET=8 → top = 200 - 46 - 8 = 146
    // left = clamp(400 + 50 - 200, 8, 1024 - 400 - 8) = clamp(250, 8, 616) = 250
    mockToDOMRange.mockReturnValue({
      getBoundingClientRect: jest
        .fn()
        .mockReturnValue(makeRect({ top: 200, bottom: 220, left: 400, width: 100 })),
    });

    const { result } = renderHook(() => useFloatingToolbarPosition());

    expect(result.current).toEqual({
      top: 200 - TOOLBAR_HEIGHT - OFFSET,
      left: 250,
      visible: true,
      flipBelow: false,
    });
  });

  test('flips toolbar below selection when rect.top is too close to the viewport top', () => {
    // rect.top=30 < TOOLBAR_HEIGHT+OFFSET=54 → flipBelow=true, top = bottom + OFFSET = 50 + 8 = 58
    // left = clamp(200 + 50 - 200, 8, 616) = clamp(50, 8, 616) = 50
    mockToDOMRange.mockReturnValue({
      getBoundingClientRect: jest
        .fn()
        .mockReturnValue(makeRect({ top: 30, bottom: 50, left: 200, width: 100 })),
    });

    const { result } = renderHook(() => useFloatingToolbarPosition());

    expect(result.current).toEqual({
      top: 50 + OFFSET,
      left: 50,
      visible: true,
      flipBelow: true,
    });
  });

  test('clamps left to 8px minimum when selection is near the left viewport edge', () => {
    // raw left = 0 + 5 - 200 = -195 → clamped to 8
    mockToDOMRange.mockReturnValue({
      getBoundingClientRect: jest
        .fn()
        .mockReturnValue(makeRect({ top: 200, left: 0, right: 10, width: 10 })),
    });

    const { result } = renderHook(() => useFloatingToolbarPosition());

    expect(result.current.visible).toBe(true);
    expect(result.current.left).toBe(8);
  });

  test('clamps left to (innerWidth - toolbarWidth - 8) when selection is near the right viewport edge', () => {
    // raw left = 1000 + 5 - 200 = 805 → clamped to 1024 - 400 - 8 = 616
    mockToDOMRange.mockReturnValue({
      getBoundingClientRect: jest
        .fn()
        .mockReturnValue(makeRect({ top: 200, left: 1000, right: 1010, width: 10 })),
    });

    const { result } = renderHook(() => useFloatingToolbarPosition());

    expect(result.current.visible).toBe(true);
    expect(result.current.left).toBe(window.innerWidth - TOOLBAR_WIDTH - OFFSET);
  });
});
