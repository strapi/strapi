import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Router } from 'react-router-dom';

import LanguageProvider from '../../../../../../../../components/LanguageProvider';
import en from '../../../../../../../../translations/en.json';
import WebhookForm from '../index';

jest.mock('../../../../../../../../hooks/useContentTypes');

const makeApp = (component) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const history = createMemoryHistory();
  const messages = { en };
  const localeNames = { en: 'English' };

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider messages={messages} localeNames={localeNames}>
        <ThemeProvider theme={lightTheme}>
          <Router history={history}>
            <NotificationsProvider toggleNotification={() => {}}>{component}</NotificationsProvider>
          </Router>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

describe('Create Webhook', () => {
  it('renders without crashing', () => {
    const triggerWebhook = jest.fn();
    triggerWebhook.cancel = jest.fn();

    const App = makeApp(
      <WebhookForm
        handleSubmit={jest.fn()}
        isCreating={false}
        isTriggering={false}
        isTriggerIdle={false}
        triggerWebhook={triggerWebhook}
        data={{
          name: '',
        }}
      />
    );

    render(App);
  });

  it('submit the form', async () => {
    const triggerWebhook = jest.fn();
    triggerWebhook.cancel = jest.fn();

    const handleSubmit = jest.fn();

    const App = makeApp(
      <WebhookForm
        handleSubmit={handleSubmit}
        isCreating={false}
        isTriggering={false}
        isTriggerIdle={false}
        triggerWebhook={triggerWebhook}
        data={{
          name: '',
        }}
      />
    );

    render(App);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'My webhook' } });
    fireEvent.change(screen.getByLabelText(/url/i), { target: { value: 'https://google.fr' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /entry.create/i }));

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(handleSubmit.mock.calls[0][0]).toEqual({
        name: 'My webhook',
        url: 'https://google.fr',
        events: ['entry.create'],
        headers: [{ key: '', value: '' }],
      });
    });

    expect(saveButton).toHaveAttribute('aria-disabled', 'true');
  });
});
