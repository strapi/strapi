import { fireEvent } from '@testing-library/react';
import { screen, render, server } from '@tests/utils';
import { rest } from 'msw';

import { CreateModal } from '../CreateModal';

jest.mock('../../hooks/useDefaultLocales');

describe('Create Modal', () => {
  it('should render correctly', async () => {
    const { user } = render(<CreateModal onClose={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Configurations' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Close the modal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('tablist', { name: 'Configurations' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Basic settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Advanced settings' })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'Basic settings' })).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: 'Locales' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Locale display name' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Advanced settings' }));

    expect(screen.getByRole('checkbox', { name: 'Set as default locale' })).toBeInTheDocument();
  });

  it('should allow the user to create a new locale', async () => {
    const { user } = render(<CreateModal onClose={jest.fn()} />);

    await user.click(screen.getByRole('combobox', { name: 'Locales' }));
    await user.click(screen.getByRole('option', { name: 'Afrikaans (af)' }));

    await user.type(screen.getByRole('textbox', { name: 'Locale display name' }), 'Afrikaans');

    await user.click(screen.getByRole('tab', { name: 'Advanced settings' }));

    await user.click(screen.getByRole('checkbox', { name: 'Set as default locale' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/Success/)).toBeInTheDocument();
  });

  it('should call the onClose prop when the user clicks on the close button', async () => {
    const onCloseSpy = jest.fn();

    const { user } = render(<CreateModal onClose={onCloseSpy} />);

    await user.click(screen.getByRole('button', { name: 'Close the modal' }));

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it('should show an error if the creation fails', async () => {
    const originalWarn = console.warn;
    console.warn = jest.fn();

    server.use(rest.post('/i18n/locales', (_, res, ctx) => res(ctx.status(500))));

    const { user } = render(<CreateModal onClose={jest.fn()} />);

    await user.click(screen.getByRole('combobox', { name: 'Locales' }));
    await user.click(screen.getByRole('option', { name: 'Afrikaans (af)' }));

    await user.type(screen.getByRole('textbox', { name: 'Locale display name' }), 'Afrikaans');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Request failed with status code 500')).toBeInTheDocument();

    console.warn = originalWarn;
  });
});
