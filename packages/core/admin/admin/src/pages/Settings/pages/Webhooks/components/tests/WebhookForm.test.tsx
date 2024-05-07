import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { WebhookForm } from '../WebhookForm';

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
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
