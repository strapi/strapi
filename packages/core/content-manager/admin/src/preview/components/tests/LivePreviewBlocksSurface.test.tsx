import { useField } from '@strapi/admin/strapi-admin';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { usePreviewContext } from '../../pages/Preview';
import { INTERNAL_EVENTS } from '../../utils/constants';
import { LivePreviewBlocksSurface } from '../LivePreviewBlocksSurface';

import type { UseDocument } from '../../../hooks/useDocument';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../pages/Preview', () => ({
  usePreviewContext: jest.fn(),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  useField: jest.fn(),
}));

const mockSendMessage = jest.fn();
jest.mock('../../utils/getSendMessage', () => ({
  getSendMessage: jest.fn(() => mockSendMessage),
}));

jest.mock('../../../pages/EditView/components/FormInputs/BlocksInput/BlocksEditor', () => ({
  BlocksEditor: ({ name }: { name: string }) => (
    <div data-testid="blocks-editor" data-name={name} />
  ),
}));

jest.mock('../PreviewBlocksToolbar', () => ({
  PreviewBlocksToolbar: () => <div data-testid="blocks-toolbar" />,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockSetBlocksEditSession = jest.fn();

const makeIframeRef = () => {
  const iframe = document.createElement('iframe');
  // src must parse as a valid URL to avoid exceptions in the origin effect
  Object.defineProperty(iframe, 'src', { value: '', configurable: true });
  jest.spyOn(iframe, 'getBoundingClientRect').mockReturnValue({
    top: 100,
    left: 0,
    right: 800,
    bottom: 700,
    width: 800,
    height: 600,
    x: 0,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect);
  return { current: iframe };
};

const makeSession = (overrides = {}) => ({
  fieldPath: 'body',
  position: { top: 50, left: 0, right: 600, bottom: 150, width: 600, height: 100 },
  attribute: { type: 'blocks' as const },
  ...overrides,
});

const setupContext = ({
  blocksEditSession = null as ReturnType<typeof makeSession> | null,
  iframeRef = makeIframeRef(),
} = {}) => {
  const contextValue = {
    blocksEditSession,
    iframeRef,
    setBlocksEditSession: mockSetBlocksEditSession,
  };
  (usePreviewContext as jest.Mock).mockImplementation(
    (_name: string, selector: (ctx: typeof contextValue) => unknown) => selector(contextValue)
  );
  return contextValue;
};

const mockDocumentResponse = {} as unknown as ReturnType<UseDocument>;

const mockFieldValue = [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LivePreviewBlocksSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useField as jest.Mock).mockReturnValue({
      value: mockFieldValue,
      onChange: jest.fn(),
      error: undefined,
    });
  });

  test('renders nothing when there is no active blocks edit session', () => {
    setupContext({ blocksEditSession: null });
    const { container } = render(
      <LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('renders BlocksEditor when a session is active', () => {
    setupContext({ blocksEditSession: makeSession() });
    render(<LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />);
    expect(screen.getByTestId('blocks-editor')).toBeInTheDocument();
  });

  test('ends session when Escape is pressed', () => {
    setupContext({ blocksEditSession: makeSession() });
    render(<LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockSetBlocksEditSession).toHaveBeenCalledWith(null);
  });

  test('ends session on mousedown outside the editor container', () => {
    setupContext({ blocksEditSession: makeSession() });
    render(<LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />);

    fireEvent.mouseDown(document.body);

    expect(mockSetBlocksEditSession).toHaveBeenCalledWith(null);
  });

  test('does not end session on mousedown inside the editor container', () => {
    setupContext({ blocksEditSession: makeSession() });
    render(<LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />);

    fireEvent.mouseDown(screen.getByTestId('blocks-editor'));

    expect(mockSetBlocksEditSession).not.toHaveBeenCalled();
  });

  test.each([
    ['[role="listbox"]', 'Radix Select dropdown (block type selector)'],
    ['[role="dialog"]', 'Radix Dialog (image / link modal)'],
    ['[role="menu"]', 'Radix DropdownMenu (BlocksToolbar overflow menu)'],
  ])('does not end session on mousedown inside a portaled %s (%s)', (selector) => {
    setupContext({ blocksEditSession: makeSession() });
    render(<LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />);

    const portaledEl = document.createElement('div');
    portaledEl.setAttribute('role', selector.match(/role="([^"]+)"/)?.[1] ?? '');
    document.body.appendChild(portaledEl);

    fireEvent.mouseDown(portaledEl);

    expect(mockSetBlocksEditSession).not.toHaveBeenCalled();

    portaledEl.remove();
  });

  test('ends session when the iframe sends STRAPI_CLICK_OUTSIDE_BLOCKS', () => {
    setupContext({ blocksEditSession: makeSession() });
    render(<LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: INTERNAL_EVENTS.STRAPI_CLICK_OUTSIDE_BLOCKS },
        })
      );
    });

    expect(mockSetBlocksEditSession).toHaveBeenCalledWith(null);
  });

  test('updates overlay position when the iframe sends STRAPI_FIELD_POSITION_SYNC', () => {
    setupContext({ blocksEditSession: makeSession() });
    render(<LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: INTERNAL_EVENTS.STRAPI_FIELD_POSITION_SYNC,
            payload: { top: 300, left: 20, width: 500, height: 80, bottom: 380, right: 520 },
          },
        })
      );
    });

    // The inner container's top style should reflect the new position
    const container = screen.getByTestId('blocks-editor-container');
    expect(container).toHaveStyle({ top: '300px' });
    expect(container).toHaveStyle({ left: '20px' });
  });

  test('sends STRAPI_BLOCKS_EDIT_START when the editor mounts', () => {
    setupContext({ blocksEditSession: makeSession() });
    render(<LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />);

    expect(mockSendMessage).toHaveBeenCalledWith(INTERNAL_EVENTS.STRAPI_BLOCKS_EDIT_START, {
      fieldPath: 'body',
    });
  });

  test('sends STRAPI_BLOCKS_EDIT_END when the editor unmounts', () => {
    setupContext({ blocksEditSession: makeSession() });
    const { unmount } = render(
      <LivePreviewBlocksSurface documentResponse={mockDocumentResponse} />
    );

    mockSendMessage.mockClear();
    unmount();

    expect(mockSendMessage).toHaveBeenCalledWith(INTERNAL_EVENTS.STRAPI_BLOCKS_EDIT_END, {
      fieldPath: 'body',
    });
  });
});
