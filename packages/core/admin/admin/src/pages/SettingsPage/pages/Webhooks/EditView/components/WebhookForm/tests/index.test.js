import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { lightTheme, darkTheme } from '@strapi/design-system';
import en from '../../../../../../../../translations/en.json';
import Theme from '../../../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../../../components/ThemeToggleProvider';
import LanguageProvider from '../../../../../../../../components/LanguageProvider';
import WebhookForm from '../index';

const makeApp = component => {
  const history = createMemoryHistory();
  const messages = { en };
  const localeNames = { en: 'English' };

  return (
    <LanguageProvider messages={messages} localeNames={localeNames}>
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <Router history={history}>{component}</Router>
        </Theme>
      </ThemeToggleProvider>
    </LanguageProvider>
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
        isDraftAndPublishEvents={false}
        triggerWebhook={triggerWebhook}
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
        isDraftAndPublishEvents={false}
        triggerWebhook={triggerWebhook}
      />
    );

    render(App);

    userEvent.type(screen.getByLabelText(/name/i), 'My webhook');
    userEvent.type(screen.getByLabelText(/url/i), 'https://google.fr');
    fireEvent.click(screen.getByRole('checkbox', { name: /entry.create/i }));

    userEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(handleSubmit.mock.calls[0][0]).toEqual({
        name: 'My webhook',
        url: 'https://google.fr',
        events: ['entry.create'],
        headers: [{ key: '', value: '' }],
      });
    });
  });
});
