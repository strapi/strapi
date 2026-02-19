import { useField } from '@strapi/admin/strapi-admin';
import { renderHook, act, waitFor } from '@tests/utils';

import { useHasInputPopoverParent } from '../../components/InputPopover';
import { usePreviewContext } from '../../pages/Preview';
import { INTERNAL_EVENTS } from '../../utils/constants';
import { usePreviewInputManager } from '../usePreviewInputManager';

// Mocks
jest.mock('@strapi/admin/strapi-admin', () => ({
  useField: jest.fn(),
}));

jest.mock('../../pages/Preview', () => ({
  usePreviewContext: jest.fn(),
}));

jest.mock('../../components/InputPopover', () => ({
  useHasInputPopoverParent: jest.fn(),
}));

describe('usePreviewInputManager', () => {
  const mockIframeRef = {
    current: {
      src: 'http://localhost:3000',
      contentWindow: {
        postMessage: jest.fn(),
      },
    },
  };

  const mockSetPopoverField = jest.fn();
  let mockFieldValue = 'test-value';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFieldValue = 'test-value';

    (usePreviewContext as jest.Mock).mockImplementation((consumerName, selector) => {
      // The hook is called as: usePreviewContext(consumerName, selector, checkContext)
      // We only care about the selector here
      if (typeof selector === 'function') {
        const state = {
          iframeRef: mockIframeRef,
          setPopoverField: mockSetPopoverField,
        };
        return selector(state);
      }
      return null;
    });

    (useField as jest.Mock).mockImplementation(() => ({ value: mockFieldValue }));
    (useHasInputPopoverParent as jest.Mock).mockReturnValue(false);
  });

  const defaultProps = {
    name: 'test-field',
    attribute: { type: 'text' } as any,
  };

  test('sends focus event on focus', () => {
    const { result } = renderHook(() =>
      usePreviewInputManager(defaultProps.name, defaultProps.attribute)
    );

    // Clear the initial mount change event
    jest.clearAllMocks();

    act(() => {
      result.current.onFocus({} as any);
    });

    expect(mockIframeRef.current.contentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: INTERNAL_EVENTS.STRAPI_FIELD_FOCUS,
        payload: { field: 'test-field' },
      },
      'http://localhost:3000'
    );
  });

  test('sends blur event on blur', () => {
    const { result } = renderHook(() =>
      usePreviewInputManager(defaultProps.name, defaultProps.attribute)
    );

    // Clear the initial mount change event
    jest.clearAllMocks();

    act(() => {
      result.current.onBlur({} as any);
    });

    expect(mockSetPopoverField).toHaveBeenCalledWith(null);

    expect(mockIframeRef.current.contentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: INTERNAL_EVENTS.STRAPI_FIELD_BLUR,
        payload: { field: 'test-field' },
      },
      'http://localhost:3000'
    );
  });

  test('does not send focus/blur events if inside popover parent', () => {
    (useHasInputPopoverParent as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() =>
      usePreviewInputManager(defaultProps.name, defaultProps.attribute)
    );

    // Clear the initial mount change event
    jest.clearAllMocks();

    act(() => {
      result.current.onFocus({} as any);
    });
    expect(mockIframeRef.current.contentWindow.postMessage).not.toHaveBeenCalled();

    act(() => {
      result.current.onBlur({} as any);
    });
    expect(mockIframeRef.current.contentWindow.postMessage).not.toHaveBeenCalled();
  });

  test('sends change event when value changes for allowed types', async () => {
    const { rerender } = renderHook(
      (props: any) => usePreviewInputManager(props.name, props.attribute),
      {
        initialProps: defaultProps,
      }
    );

    // Check initial effect call
    expect(mockIframeRef.current.contentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
        payload: { field: 'test-field', value: 'test-value' },
      },
      'http://localhost:3000'
    );

    // Update value
    mockFieldValue = 'new-value';

    // Force re-render with slightly different props to ensure hook runs
    rerender({ ...defaultProps, attribute: { ...defaultProps.attribute, minLength: 1 } });

    await waitFor(() => {
      expect(mockIframeRef.current.contentWindow.postMessage).toHaveBeenCalledWith(
        {
          type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
          payload: { field: 'test-field', value: 'new-value' },
        },
        'http://localhost:3000'
      );
    });
  });

  test('does not send change event for excluded field types', () => {
    const excludedTypes = ['component', 'dynamiczone'];

    excludedTypes.forEach((type) => {
      jest.clearAllMocks();

      // We need to set the mock value back to default or anything to avoid confusion
      (useField as jest.Mock).mockReturnValue({ value: 'test-value' });

      const props = {
        name: 'excluded-field',
        attribute: { type } as any,
      };

      renderHook(() => usePreviewInputManager(props.name, props.attribute));

      const calls = mockIframeRef.current.contentWindow.postMessage.mock.calls.filter(
        (call) => call[0].type === INTERNAL_EVENTS.STRAPI_FIELD_CHANGE
      );

      expect(calls).toHaveLength(0);
    });
  });

  test('sends change event for complex types removed from exclusion list (media)', () => {
    const props = {
      name: 'media-field',
      attribute: { type: 'media' } as any,
    };

    renderHook(() => usePreviewInputManager(props.name, props.attribute));

    expect(mockIframeRef.current.contentWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
        payload: expect.objectContaining({ field: 'media-field' }),
      }),
      expect.any(String)
    );
  });
});
