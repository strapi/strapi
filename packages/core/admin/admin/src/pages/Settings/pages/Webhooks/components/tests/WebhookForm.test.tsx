import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { WebhookForm, parseWebhookBody } from '../WebhookForm';

jest.mock('../../../../../../hooks/useContentTypes');

describe('WebhookForm', () => {
  it('renders without crashing', () => {
    const triggerWebhook = jest.fn();

    render(
      <WebhookForm
        handleSubmit={jest.fn()}
        isCreating={false}
        isTriggering={false}
        triggerWebhook={triggerWebhook}
      />
    );

    expect(screen.getByRole('heading', { name: '' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Url' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'row 1 key' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'row 1 value' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Create new header' })).toBeInTheDocument();

    expect(screen.getByText('Request body')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Leave empty to send the default payload. Insert event data with {{ entry.title }}.'
      )
    ).toBeInTheDocument();
    // The body mode only matters once there is a body
    expect(screen.queryByRole('combobox', { name: 'Default payload' })).not.toBeInTheDocument();

    expect(screen.getByRole('grid', { name: 'Events' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('submits the form', async () => {
    const triggerWebhook = jest.fn();

    const handleSubmit = jest.fn();

    const { user } = render(
      <WebhookForm
        handleSubmit={handleSubmit}
        isCreating={false}
        isTriggering={false}
        triggerWebhook={triggerWebhook}
      />
    );

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'My webhook');
    await user.type(screen.getByRole('textbox', { name: 'Url' }), 'https://google.fr');

    fireEvent.click(screen.getByRole('checkbox', { name: /entry.create/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    expect(handleSubmit.mock.calls[0][0]).toEqual({
      name: 'My webhook',
      url: 'https://google.fr',
      events: ['entry.create'],
      headers: [{ key: '', value: '' }],
      body: '',
      bodyMode: 'merge',
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  describe('body template', () => {
    // The JSON editor (CodeMirror) splits its text into highlighted spans
    const getEditorText = (container: HTMLElement) =>
      container.querySelector('.cm-content')?.textContent ?? '';

    const webhook = {
      id: '1',
      name: 'Deploy',
      url: 'https://example.com',
      headers: {},
      events: [],
      body: { ref: 'main' },
      bodyMode: 'merge' as const,
      isEnabled: true,
    };

    it('shows the saved body template and its mode', () => {
      const { container } = render(
        <WebhookForm
          data={{ ...webhook, bodyMode: 'replace' }}
          handleSubmit={jest.fn()}
          isCreating={false}
          isTriggering={false}
          triggerWebhook={jest.fn()}
        />
      );

      expect(getEditorText(container)).toContain('"ref": "main"');
      expect(screen.getByRole('combobox', { name: 'Default payload' })).toHaveTextContent(
        'Replace it with the request body'
      );
    });

    it('adds the body to the default payload by default', () => {
      render(
        <WebhookForm
          data={{ ...webhook, bodyMode: undefined }}
          handleSubmit={jest.fn()}
          isCreating={false}
          isTriggering={false}
          triggerWebhook={jest.fn()}
        />
      );

      expect(screen.getByRole('combobox', { name: 'Default payload' })).toHaveTextContent(
        'Add the request body to it'
      );
    });

    it('switches the body mode and submits it with the body template', async () => {
      const handleSubmit = jest.fn();

      const { user } = render(
        <WebhookForm
          data={webhook}
          handleSubmit={handleSubmit}
          isCreating={false}
          isTriggering={false}
          triggerWebhook={jest.fn()}
        />
      );

      await user.click(screen.getByRole('combobox', { name: 'Default payload' }));
      await user.click(screen.getByRole('option', { name: 'Replace it with the request body' }));

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
      expect(handleSubmit.mock.calls[0][0]).toMatchObject({
        body: JSON.stringify({ ref: 'main' }, null, 2),
        bodyMode: 'replace',
      });
    });
  });
});

describe('parseWebhookBody', () => {
  it('returns null for an empty text', () => {
    expect(parseWebhookBody('')).toBeNull();
    expect(parseWebhookBody('  \n')).toBeNull();
  });

  it('returns the parsed JSON object', () => {
    expect(
      parseWebhookBody('{ "ref": "main", "inputs": { "title": "{{ entry.title }}" } }')
    ).toEqual({
      ref: 'main',
      inputs: { title: '{{ entry.title }}' },
    });
  });

  it('throws for invalid JSON and for JSON that is not an object', () => {
    expect(() => parseWebhookBody('{ ref: main }')).toThrow();
    expect(() => parseWebhookBody('["ref"]')).toThrow('The body must be a JSON object');
    expect(() => parseWebhookBody('"ref"')).toThrow('The body must be a JSON object');
    expect(() => parseWebhookBody('null')).toThrow('The body must be a JSON object');
  });
});
