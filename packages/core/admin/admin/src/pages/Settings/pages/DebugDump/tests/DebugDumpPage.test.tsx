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
  });
});
