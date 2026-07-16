import { render, screen, waitFor } from '@tests/utils';

import { DebugDumpPage } from '../DebugDumpPage';

const trigger = jest
  .fn()
  .mockResolvedValue({ data: { dumpVersion: 1, strapi: { edition: 'CE' } } });

jest.mock('../../../../../services/admin', () => ({
  useLazyGetDebugDumpQuery: () => [trigger, { data: undefined, isFetching: false }],
}));

describe('DebugDumpPage', () => {
  it('renders and generates a dump on click', async () => {
    const { user } = render(<DebugDumpPage />);
    const button = await screen.findByRole('button', { name: /generate/i });
    await user.click(button);
    await waitFor(() => expect(trigger).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('notifies and shows no preview when generation fails', async () => {
    trigger.mockResolvedValueOnce({ error: { name: 'ApplicationError', message: 'boom' } });
    const { user } = render(<DebugDumpPage />);
    const button = await screen.findByRole('button', { name: /generate/i });
    await user.click(button);
    expect(await screen.findByText(/failed to generate/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
  });
});
