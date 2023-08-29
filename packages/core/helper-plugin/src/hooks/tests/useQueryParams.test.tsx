/* eslint-disable check-file/filename-naming-convention */

import { renderHook, act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import { useQueryParams } from '../useQueryParams';

const history = createMemoryHistory();

describe('useQueryParams', () => {
  it('should set and remove the query params using setQuery method', () => {
    const { result } = renderHook(({ initialParams }) => useQueryParams(initialParams), {
      wrapper: ({ children }) => <Router history={history}>{children}</Router>,
      initialProps: { initialParams: { page: 1, type: 'plugins' } },
    });

    const [{ query }, setQuery] = result.current;
    expect(query).toEqual({ page: 1, type: 'plugins' }); // initial params

    act(() => {
      setQuery({ type: 'plugins' }, 'remove');
    });
    const searchParams = new URLSearchParams(history.location.search);
    expect(searchParams.has('type')).toBe(false);
    expect(searchParams.has('page')).toBe(true);

    act(() => {
      setQuery({ filters: { type: 'audio' }, page: 1 });
    });
    const updatedSearchParams = new URLSearchParams(history.location.search);
    expect(updatedSearchParams.get('page')).toEqual('1');
    expect(updatedSearchParams.get('filters[type]')).toEqual('audio');
  });
});
