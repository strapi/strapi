import { QueryClient } from '@tanstack/react-query';

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  QueryClient: jest.fn(),
}));

describe('Providers', () => {
  it('preserves v3 offline behavior for queries and mutations', async () => {
    await import('../Providers');

    expect(QueryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultOptions: expect.objectContaining({
          queries: expect.objectContaining({
            networkMode: 'offlineFirst',
          }),
          mutations: {
            networkMode: 'offlineFirst',
          },
        }),
      })
    );
  });
});
