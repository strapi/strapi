import { render, screen, waitFor } from '@strapi/admin/strapi-admin/test';

import { SchemaChatProvider, useChatSchema } from '../SchemaProvider';

import type { AIMessage } from '../../lib/types/messages';

const applyChange = jest.fn();
let messages: AIMessage[] = [];

jest.mock('../../../DataManager/useDataManager', () => ({
  useDataManager: () => ({ contentTypes: {}, components: {}, applyChange }),
}));

jest.mock('../ChatProvider', () => ({
  useStrapiChat: () => ({ messages, status: 'ready' }),
}));

jest.mock('../../lib/transforms/schemas/toCTB', () => ({
  transformChatToCTB: (schema: unknown) => schema,
}));

jest.mock('@strapi/admin/strapi-admin', () => {
  const guidedTour = { dispatch: jest.fn(), state: { completedActions: [] } };

  return {
    ...jest.requireActual('@strapi/admin/strapi-admin'),
    useGuidedTour: (_name: string, selector: (s: typeof guidedTour) => unknown) =>
      selector(guidedTour),
  };
});

const schemaFor = (name: string) => ({
  uid: `api::${name}.${name}`,
  name,
  modelType: 'contentType',
  action: 'update',
});

const message = {
  id: 'message-1',
  role: 'assistant',
  parts: [
    {
      type: 'tool-schemaGenerationTool',
      toolCallId: 'call-1',
      state: 'output-available',
      input: {},
      output: { schemas: [schemaFor('a'), schemaFor('b'), schemaFor('c')] },
    },
  ],
} as unknown as AIMessage;

const LastRevisedId = () => {
  const { lastRevisedId } = useChatSchema();

  return <p data-testid="last-revised-id">{lastRevisedId ?? 'none'}</p>;
};

const setup = () =>
  render(
    <SchemaChatProvider>
      <LastRevisedId />
    </SchemaChatProvider>
  );

const appliedUids = () => applyChange.mock.calls.map(([{ schema }]) => schema.uid);

describe('CTB | AIChat | SchemaChatProvider', () => {
  beforeEach(() => {
    applyChange.mockReset();
    messages = [message];
  });

  it('applies every change and marks the message revised', async () => {
    applyChange.mockResolvedValue(true);

    setup();

    await waitFor(() =>
      expect(screen.getByTestId('last-revised-id')).toHaveTextContent('message-1')
    );
    expect(appliedUids()).toEqual(['api::a.a', 'api::b.b', 'api::c.c']);
    expect(applyChange).toHaveBeenCalledWith({ action: 'update', schema: schemaFor('a') });
  });

  it('stops the batch and does not mark the message revised when a change is cancelled', async () => {
    applyChange.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    setup();

    await waitFor(() => expect(applyChange).toHaveBeenCalledTimes(2));
    // Let the effect settle: a third change or a revision would land now.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(appliedUids()).toEqual(['api::a.a', 'api::b.b']);
    expect(screen.getByTestId('last-revised-id')).toHaveTextContent('none');
  });
});
