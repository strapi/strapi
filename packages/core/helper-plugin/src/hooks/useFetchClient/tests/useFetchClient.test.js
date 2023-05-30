import * as React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { render } from '@testing-library/react';

import { useFetchClient } from '..';

const server = setupServer(
  rest.get('/test', (req, res, ctx) => res(ctx.json({}))),
  rest.put('/test', (req, res, ctx) => res(ctx.json({ body: req.body }))),
  rest.post('/test', (req, res, ctx) => res(ctx.json({ body: req.body }))),
  rest.delete('/test', (req, res, ctx) => res(ctx.json({})))
);

const setup = (props) => renderHook(() => useFetchClient(props));

describe('useFetchClient | API calls', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should call GET', async () => {
    const { result } = setup();

    const data = await result.current.get('/test');

    expect(data.data).toStrictEqual({});
  });

  it('Should call POST', async () => {
    const { result } = setup();

    const data = await result.current.post('/test', { something: true });

    expect(data.data).toStrictEqual({ body: { something: true } });
  });

  it('Should call PUT', async () => {
    const { result } = setup();

    const data = await result.current.put('/test', { something: true });

    expect(data.data).toStrictEqual({ body: { something: true } });
  });

  it('Should call DELETE', async () => {
    const { result } = setup();

    const data = await result.current.del('/test');

    expect(data.data).toStrictEqual({});
  });

  it('should export a stable function definition', () => {
    jest.doMock('..', () => ({
      ...jest.requireActual('..'),
      useFetchClient: jest.fn().mockReturnValue({
        get: jest.fn(),
      }),
    }));

    const { get } = useFetchClient();

    const Component = () => {
      const { get } = useFetchClient();

      React.useEffect(() => {
        const sendRequest = async () => {
          try {
            await get('/test');
          } catch (error) {
            // silence
          }
        };

        sendRequest();
      }, [get]);

      return <div />;
    };

    const { rerender } = render(<Component />);

    rerender();

    expect(get).toHaveBeenCalledTimes(1);
  });
});
