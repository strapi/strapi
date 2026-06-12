/* eslint-disable check-file/filename-naming-convention */
import { renderHook } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import { useMediaQuery, useIsDesktop, useIsTablet, useIsMobile } from '../useMediaQuery';

const theme = {
  breakpoints: {
    medium: '@media (min-width: 768px)',
    large: '@media (min-width: 1024px)',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => {
  // @ts-expect-error - partial theme for testing
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

describe('useMediaQuery', () => {
  let matchMediaMock: jest.Mock;
  let addEventListenerMock: jest.Mock;
  let removeEventListenerMock: jest.Mock;

  beforeEach(() => {
    addEventListenerMock = jest.fn();
    removeEventListenerMock = jest.fn();
    matchMediaMock = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      media: '',
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when media query matches', () => {
    matchMediaMock.mockReturnValueOnce({
      matches: true,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      media: '',
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(true);
    expect(matchMediaMock).toHaveBeenCalledWith('(min-width: 768px)');
  });

  it('should return false when media query does not match', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(false);
  });

  it('should strip @media prefix from query', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    renderHook(() => useMediaQuery('@media (min-width: 768px)'));

    expect(matchMediaMock).toHaveBeenCalledWith('(min-width: 768px)');
  });

  it('should add event listener and update when media query changes', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('useIsDesktop', () => {
  let matchMediaMock: jest.Mock;

  beforeEach(() => {
    matchMediaMock = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      media: '',
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
    window.matchMedia = matchMediaMock;
  });

  it('should return true when viewport is desktop size', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsDesktop(), { wrapper });

    expect(result.current).toBe(true);
    expect(matchMediaMock).toHaveBeenCalledWith('(min-width: 1024px)');
  });

  it('should return false when viewport is not desktop size', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsDesktop(), { wrapper });

    expect(result.current).toBe(false);
  });
});

describe('useIsTablet', () => {
  let matchMediaMock: jest.Mock;

  beforeEach(() => {
    matchMediaMock = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      media: '',
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
    window.matchMedia = matchMediaMock;
  });

  it('should return true when viewport is tablet size', () => {
    // First call for medium (tablet or above) - true
    // Second call for large (desktop) - false
    matchMediaMock
      .mockReturnValueOnce({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })
      .mockReturnValueOnce({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

    const { result } = renderHook(() => useIsTablet(), { wrapper });

    expect(result.current).toBe(true);
  });

  it('should return false when viewport is mobile', () => {
    // Medium breakpoint doesn't match (mobile)
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsTablet(), { wrapper });

    expect(result.current).toBe(false);
  });

  it('should return false when viewport is desktop', () => {
    // Both medium and large match (desktop)
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsTablet(), { wrapper });

    expect(result.current).toBe(false);
  });
});

describe('useIsMobile', () => {
  let matchMediaMock: jest.Mock;

  beforeEach(() => {
    matchMediaMock = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      media: '',
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
    window.matchMedia = matchMediaMock;
  });

  it('should return true when viewport is mobile size', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsMobile(), { wrapper });

    expect(result.current).toBe(true);
    expect(matchMediaMock).toHaveBeenCalledWith('(min-width: 768px)');
  });

  it('should return false when viewport is tablet or desktop', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsMobile(), { wrapper });

    expect(result.current).toBe(false);
  });
});
