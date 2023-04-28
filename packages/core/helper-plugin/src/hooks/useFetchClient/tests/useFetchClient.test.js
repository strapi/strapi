import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { useFetchClient } from '@strapi/helper-plugin';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        results: [
          { id: 2, name: 'newest', publishedAt: null },
          { id: 1, name: 'oldest', publishedAt: null },
        ],
        pagination: { page: 1, pageCount: 10 },
      },
    }),
    post: jest.fn(),
    put: jest.fn(),
    del: jest.fn(),
  }),
}));

const TestComponent = (props) => {
  const { get } = useFetchClient();
  useEffect(() => {
    get('/foo');
  }, [get]);

  // eslint-disable-next-line react/prop-types
  return <div {...props}>{props.children}</div>;
};

describe('useFetchClient', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('Should call once the GET method even when we rerender the Component', async () => {
    const { rerender } = render(<TestComponent>content</TestComponent>);

    const { get } = useFetchClient();

    expect(get).toHaveBeenCalledTimes(1);

    rerender();

    expect(get).toHaveBeenCalledTimes(1);
  });
});
