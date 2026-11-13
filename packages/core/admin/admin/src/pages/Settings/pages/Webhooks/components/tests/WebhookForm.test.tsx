import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { useContentTypes } from '../../../../../../hooks/useContentTypes';
import { WebhookForm, parseWebhookBody } from '../WebhookForm';

jest.mock('../../../../../../hooks/useContentTypes');

type ContentTypes = ReturnType<typeof useContentTypes>['collectionTypes'];

const mockContentTypes = (
  collectionTypes: Array<{ uid: string; displayName: string; draftAndPublish?: boolean }>
) => {
  jest.mocked(useContentTypes).mockReturnValue({
    isLoading: false,
    collectionTypes: collectionTypes.map(({ uid, displayName, draftAndPublish = false }) => ({
      uid,
      info: { displayName },
      options: { draftAndPublish },
    })) as ContentTypes,
    singleTypes: [],
  });
};

const webhook = {
  id: '1',
  name: 'My webhook',
  url: 'https://google.fr',
  headers: {},
  events: [],
  isEnabled: true,
};

const renderForm = (props: Partial<React.ComponentProps<typeof WebhookForm>> = {}) => {
  const handleSubmit = jest.fn();

  const utils = render(
    <WebhookForm
      handleSubmit={handleSubmit}
      isCreating={false}
      isTriggering={false}
      triggerWebhook={jest.fn()}
      {...props}
    />
  );

  const submit = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    return handleSubmit.mock.calls[0][0];
  };

  return { ...utils, submit };
};

describe('WebhookForm', () => {
  beforeEach(() => {
    mockContentTypes([]);
  });

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

    // Behind the unstableWebhookBodyTemplate future flag
    expect(screen.queryByText('Request body')).not.toBeInTheDocument();

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
      contentTypeEvents: {},
      headers: [{ key: '', value: '' }],
      body: '',
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
      isEnabled: true,
    };

    const renderForm = (handleSubmit = jest.fn()) =>
      render(
        <WebhookForm
          data={webhook}
          handleSubmit={handleSubmit}
          isCreating={false}
          isTriggering={false}
          triggerWebhook={jest.fn()}
        />
      );

    let isFutureFlagEnabled: jest.SpyInstance;

    beforeEach(() => {
      isFutureFlagEnabled = jest
        .spyOn(window.strapi.future, 'isEnabled')
        .mockImplementation((name) => name === 'unstableWebhookBodyTemplate');
    });

    afterEach(() => {
      isFutureFlagEnabled.mockRestore();
    });

    it('shows the saved body template and the available variables', () => {
      const { container } = renderForm();

      expect(screen.getByText('Request body')).toBeInTheDocument();
      expect(getEditorText(container)).toContain('"ref": "main"');
      expect(
        screen.getByText(
          'Sent in place of the default payload, leave empty to keep it. Available variables: {{ event }}, {{ createdAt }}. For entry events: {{ model }}, {{ uid }}, {{ documentId }}, {{ entry }}, and {{ entry.title }} when the events are selected per content type.'
        )
      ).toBeInTheDocument();
    });

    it('submits the body template', async () => {
      const handleSubmit = jest.fn();
      renderForm(handleSubmit);

      fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
        target: { value: 'Renamed' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
      expect(handleSubmit.mock.calls[0][0]).toMatchObject({
        body: JSON.stringify({ ref: 'main' }, null, 2),
      });
    });

    it('hides the input when the future flag is off', () => {
      isFutureFlagEnabled.mockReturnValue(false);

      renderForm();

      expect(screen.queryByText('Request body')).not.toBeInTheDocument();
    });
  });

  describe('content type events', () => {
    beforeEach(() => {
      mockContentTypes([
        { uid: 'api::page.page', displayName: 'Page', draftAndPublish: true },
        { uid: 'api::article.article', displayName: 'Article' },
      ]);
    });

    it('lists the content types below the entry events', () => {
      renderForm();

      const rows = screen.getAllByRole('row').map((row) => row.textContent);

      expect(rows.slice(1, 5)).toEqual(['Entry', 'Article', 'Page', 'Media']);
    });

    it('submits the events selected per content type', async () => {
      const { user, submit } = renderForm({ data: webhook });

      await user.click(screen.getByRole('checkbox', { name: 'Article: entry.create' }));
      await user.click(screen.getByRole('checkbox', { name: 'Page: entry.publish' }));
      await user.click(screen.getByRole('checkbox', { name: 'Page: entry.update' }));
      await user.click(screen.getByRole('checkbox', { name: 'Page: entry.update' }));

      expect(await submit()).toMatchObject({
        events: [],
        contentTypeEvents: {
          'api::article.article': ['entry.create'],
          'api::page.page': ['entry.publish'],
        },
      });
    });

    it('removes a content type once none of its events is selected', async () => {
      const { user, submit } = renderForm({
        data: {
          ...webhook,
          events: ['media.create'],
          contentTypeEvents: { 'api::article.article': ['entry.create'] },
        },
      });

      await user.click(screen.getByRole('checkbox', { name: 'Article: entry.create' }));
      await user.click(screen.getByRole('checkbox', { name: 'media.delete' }));

      expect(await submit()).toMatchObject({ contentTypeEvents: {} });
    });

    it('selects every available event of a content type from its row', async () => {
      const { user, submit } = renderForm({ data: webhook });

      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      await user.click(screen.getByRole('checkbox', { name: 'Page' }));

      expect(screen.getByRole('checkbox', { name: 'Article' })).toBeChecked();

      expect(await submit()).toMatchObject({
        contentTypeEvents: {
          // Article has no draft & publish
          'api::article.article': ['entry.create', 'entry.update', 'entry.delete'],
          'api::page.page': [
            'entry.create',
            'entry.update',
            'entry.delete',
            'entry.publish',
            'entry.unpublish',
          ],
        },
      });
    });

    it('disables the publish events of content types without draft & publish', () => {
      renderForm({ data: { ...webhook, events: ['entry.publish'] } });

      expect(screen.getByRole('checkbox', { name: 'Article: entry.publish' })).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: 'Article: entry.publish' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Article: entry.unpublish' })).toBeDisabled();
    });

    it('displays the events selected for every content type as selected on each content type', async () => {
      const { user, submit } = renderForm({
        data: {
          ...webhook,
          events: ['entry.create'],
          contentTypeEvents: { 'api::page.page': ['entry.publish'] },
        },
      });

      for (const name of ['Article: entry.create', 'Page: entry.create']) {
        expect(screen.getByRole('checkbox', { name })).toBeChecked();
        expect(screen.getByRole('checkbox', { name })).toBeDisabled();
      }

      expect(screen.getByRole('checkbox', { name: 'Page: entry.publish' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Page: entry.publish' })).toBeEnabled();
      expect(screen.getByRole('checkbox', { name: 'Article: entry.update' })).not.toBeChecked();

      // Selecting the row only adds the events that are not already selected for every content type
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));

      expect(await submit()).toMatchObject({
        events: ['entry.create'],
        contentTypeEvents: {
          'api::page.page': ['entry.publish'],
          'api::article.article': ['entry.update', 'entry.delete'],
        },
      });
    });

    it('unlocks the content types once the event is not selected for every content type anymore', async () => {
      const { user } = renderForm({ data: { ...webhook, events: ['entry.create'] } });

      await user.click(screen.getByRole('checkbox', { name: 'entry.create' }));

      expect(screen.getByRole('checkbox', { name: 'Article: entry.create' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Article: entry.create' })).toBeEnabled();
    });

    it('lists the saved content types that do not exist anymore so they can be removed', async () => {
      const { user, submit } = renderForm({
        data: { ...webhook, contentTypeEvents: { 'api::deleted.deleted': ['entry.create'] } },
      });

      await user.click(
        screen.getByRole('checkbox', { name: 'api::deleted.deleted: entry.create' })
      );

      expect(await submit()).toMatchObject({ contentTypeEvents: {} });
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
