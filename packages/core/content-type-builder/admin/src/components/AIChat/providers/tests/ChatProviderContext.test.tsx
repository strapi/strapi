import * as React from 'react';

import { act, render } from '@testing-library/react';

import { BaseChatProvider, useStrapiChat } from '../ChatProvider';

/**
 * `BaseChatProvider` renders nothing but its provider, so plain RTL is enough.
 * Everything it reads lives behind a hook, and each of those hooks is stubbed at
 * its module boundary so the test can hand the provider a new value and watch it
 * travel — or not — to a memoised consumer.
 */

const mockSendMessage = jest.fn();
const mockStop = jest.fn();
const mockSetMessages = jest.fn();
const mockRegenerate = jest.fn();
const mockClearError = jest.fn();
const mockResumeStream = jest.fn();
const mockAddToolResult = jest.fn();
const mockAddToolOutput = jest.fn();
const mockAddToolApprovalResponse = jest.fn();
const mockTrackUsage = jest.fn();
const mockGenerateTitle = jest.fn();
const mockResetTitle = jest.fn();

const BASE_CHAT_API = {
  id: 'chat-1',
  messages: [] as unknown[],
  sendMessage: mockSendMessage,
  status: 'ready',
  stop: mockStop,
  setMessages: mockSetMessages,
  regenerate: mockRegenerate,
  clearError: mockClearError,
  error: undefined as Error | undefined,
  resumeStream: mockResumeStream,
  addToolResult: mockAddToolResult,
  addToolOutput: mockAddToolOutput,
  addToolApprovalResponse: mockAddToolApprovalResponse,
};

const BASE_TITLE_API = {
  title: undefined as string | undefined,
  generateTitle: mockGenerateTitle,
  resetTitle: mockResetTitle,
};

const EMPTY_SCHEMAS = { contentTypes: {}, components: {} };

const ATTACHMENT = {
  id: 'a1',
  type: 'file' as const,
  filename: 'a.png',
  mediaType: 'image/png',
  url: 'https://strapi.io/a.png',
  status: 'ready' as const,
};

/**
 * Every stub reads through a mutable holder rather than closing over a value, so
 * a test can swap the value and re-render. Each holder keeps a single stable
 * object between swaps, which is what makes the stability assertions meaningful.
 */
const mockChat = { value: BASE_CHAT_API as typeof BASE_CHAT_API };
const mockTitle = { value: BASE_TITLE_API as typeof BASE_TITLE_API };
const mockDataManager = { value: EMPTY_SCHEMAS as Record<string, Record<string, unknown>> };
const mockAvailability = { value: true };
const mockLastSeenSchemas = { value: [] as { uid: string }[] };

jest.mock('../../hooks/useAIFetch', () => ({
  useAIChat: () => mockChat.value,
}));

jest.mock('../../hooks/useChatTitle', () => ({
  useChatTitle: () => mockTitle.value,
}));

jest.mock('../../hooks/useLastSeenSchemas', () => ({
  useLastSeenSchemas: () => ({ lastSeenSchemas: mockLastSeenSchemas.value }),
}));

jest.mock('../../../DataManager/useDataManager', () => ({
  useDataManager: () => mockDataManager.value,
}));

jest.mock('../../../CTBSession/ctbSession', () => ({
  useCTBTracking: () => ({ trackUsage: mockTrackUsage }),
}));

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  useAIAvailability: () => mockAvailability.value,
  useGetAiUsageQuery: () => ({ refetch: jest.fn() }),
}));

jest.mock('../../lib/transforms/schemas/fromCTB', () => ({
  transformCTBToChat: (schema: { uid: string }) => ({ uid: schema.uid }),
}));

/**
 * A memoised consumer only re-renders when the context value identity changes,
 * which is exactly what the provider's `useMemo` controls. Render counts pin
 * stability, the recorded values pin propagation of every field.
 */
const createConsumer = () => {
  const renderConsumer = jest.fn();
  const Consumer = React.memo(function Consumer() {
    const value = useStrapiChat();

    renderConsumer(value);

    return null;
  });

  return { renderConsumer, Consumer };
};

type ChatValue = ReturnType<typeof useStrapiChat>;

const lastValue = (spy: jest.Mock): ChatValue => spy.mock.calls.at(-1)?.[0];

describe('ChatProvider context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChat.value = BASE_CHAT_API;
    mockTitle.value = BASE_TITLE_API;
    mockDataManager.value = EMPTY_SCHEMAS;
    mockAvailability.value = true;
    mockLastSeenSchemas.value = [];
  });

  it('keeps the value stable when the provider re-renders with unchanged inputs', () => {
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);
  });

  it('propagates `isChatEnabled` from the AI availability hook', () => {
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).isChatEnabled).toBe(true);

    mockAvailability.value = false;
    rerender(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).isChatEnabled).toBe(false);
  });

  it('propagates `status`, `messages` and `error` from the AI SDK chat', () => {
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).status).toBe('ready');
    expect(lastValue(renderConsumer).messages).toHaveLength(0);
    expect(lastValue(renderConsumer).error).toBe(undefined);

    const error = new Error('boom');
    mockChat.value = {
      ...BASE_CHAT_API,
      status: 'error',
      messages: [{ id: 'm1', role: 'assistant', parts: [] }],
      error,
    };
    rerender(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).status).toBe('error');
    expect(lastValue(renderConsumer).messages).toHaveLength(1);
    expect(lastValue(renderConsumer).error).toBe(error);
  });

  it('propagates `title` from the chat title hook', () => {
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).title).toBe(undefined);

    mockTitle.value = { ...BASE_TITLE_API, title: 'A generated title' };
    rerender(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).title).toBe('A generated title');
  });

  it('propagates `schemas` when the data manager content types change', () => {
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).schemas).toEqual([]);

    mockDataManager.value = {
      contentTypes: {
        'api::article.article': { uid: 'api::article.article', status: 'UNCHANGED', visible: true },
      },
      components: {},
    };
    rerender(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).schemas).toEqual([{ uid: 'api::article.article' }]);
  });

  it('propagates `input` when the context input handler runs', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).input).toBe('');

    act(() => {
      lastValue(renderConsumer).handleInputChange({
        target: { value: 'hello' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    expect(lastValue(renderConsumer).input).toBe('hello');
  });

  it('propagates `isChatOpen` through `openChat` and `closeChat`', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).isChatOpen).toBe(false);

    act(() => {
      lastValue(renderConsumer).openChat();
    });

    expect(lastValue(renderConsumer).isChatOpen).toBe(true);
    expect(mockTrackUsage).toHaveBeenCalledWith('didStartNewChat');

    act(() => {
      lastValue(renderConsumer).closeChat();
    });

    expect(lastValue(renderConsumer).isChatOpen).toBe(false);
  });

  it('honours `defaultOpen` for the initial `isChatOpen`', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <BaseChatProvider defaultOpen>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).isChatOpen).toBe(true);
  });

  it('propagates `attachments` set through the context setter', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    expect(lastValue(renderConsumer).attachments).toEqual([]);

    act(() => {
      lastValue(renderConsumer).setAttachments([ATTACHMENT]);
    });

    expect(lastValue(renderConsumer).attachments).toEqual([ATTACHMENT]);
  });

  it('submits the latest input and attachments, then clears both', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    act(() => {
      lastValue(renderConsumer).setAttachments([ATTACHMENT]);
    });
    act(() => {
      lastValue(renderConsumer).handleInputChange({
        target: { value: 'hello' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    const preventDefault = jest.fn();

    act(() => {
      lastValue(renderConsumer).handleSubmit({ preventDefault });
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith(
      {
        text: 'hello',
        files: [
          {
            type: 'file',
            filename: 'a.png',
            mediaType: 'image/png',
            url: 'https://strapi.io/a.png',
          },
        ],
      },
      expect.objectContaining({
        body: expect.objectContaining({ schemas: [] }),
      })
    );
    expect(lastValue(renderConsumer).input).toBe('');
    expect(lastValue(renderConsumer).attachments).toEqual([]);
  });

  it('stops and resets the chat through the context `reset`', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <BaseChatProvider>
        <Consumer />
      </BaseChatProvider>
    );

    act(() => {
      lastValue(renderConsumer).reset();
    });

    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(mockResetTitle).toHaveBeenCalledTimes(1);
    expect(mockTrackUsage).toHaveBeenCalledWith('didStartNewChat');
  });
});
