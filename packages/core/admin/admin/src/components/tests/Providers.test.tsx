import { QueryClient } from '@tanstack/react-query';

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  QueryClient: jest.fn(),
}));

describe('Providers', () => {
  it('configures mutations to fail fast while offline', async () => {
    await import('../Providers');

    expect(QueryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultOptions: expect.objectContaining({
          mutations: {
            networkMode: 'always',
          },
        }),
      })
    );
  });
});
