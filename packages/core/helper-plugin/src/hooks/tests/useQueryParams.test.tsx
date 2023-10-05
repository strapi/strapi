/* eslint-disable check-file/filename-naming-convention */

import { renderHook, act } from '@tests/utils';
import { Route, useLocation } from 'react-router-dom';

import { useQueryParams } from '../useQueryParams';

describe('useQueryParams', () => {
  it('should set and remove the query params using setQuery method', () => {
    let testLocation: ReturnType<typeof useLocation> = null!;

    const { result } = renderHook(
      ({ initialParams }) =>
        useQueryParams<{ type?: string; filters?: object; page?: number }>(initialParams),
      {
        wrapper: ({ children }) => (
          <>
            {children}
            <Route
              path="*"
              render={({ location }) => {
                testLocation = location;

                return null;
              }}
            />
          </>
        ),
        initialProps: { initialParams: { page: 1, type: 'plugins' } },
      }
    );

    const [{ query }, setQuery] = result.current;
    expect(query).toEqual({ page: 1, type: 'plugins' }); // initial params

    act(() => {
      setQuery({ type: 'plugins' }, 'remove');
    });

    const searchParams = new URLSearchParams(testLocation.search);
    expect(searchParams.has('type')).toBe(false);
    expect(searchParams.has('page')).toBe(true);

    act(() => {
      setQuery({ filters: { type: 'audio' }, page: 1 });
    });
    const updatedSearchParams = new URLSearchParams(testLocation.search);
    expect(updatedSearchParams.get('page')).toEqual('1');
    expect(updatedSearchParams.get('filters[type]')).toEqual('audio');
  });
});
