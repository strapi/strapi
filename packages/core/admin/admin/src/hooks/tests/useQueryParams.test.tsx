/* eslint-disable check-file/filename-naming-convention */

import { renderHook, act, screen } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { useQueryParams } from '../useQueryParams';

const LocationDisplay = () => {
  const location = useLocation();

  return (
    <ul>
      <li>{location.search}</li>
    </ul>
  );
};

describe('useQueryParams', () => {
  it('should set and remove the query params using setQuery method', () => {
    const { result } = renderHook(
      ({ initialParams }) =>
        useQueryParams<{ type?: string; filters?: object; page?: number }>(initialParams),
      {
        wrapper: ({ children }) => (
          <>
            {children}
            <LocationDisplay />
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

    const searchParams = new URLSearchParams(screen.getByRole('listitem').textContent ?? '');
    expect(searchParams.has('type')).toBe(false);
    expect(searchParams.has('page')).toBe(true);

    act(() => {
      setQuery({ filters: { type: 'audio' }, page: 1 });
    });
    const updatedSearchParams = new URLSearchParams(screen.getByRole('listitem').textContent ?? '');
    expect(updatedSearchParams.get('page')).toEqual('1');
    expect(updatedSearchParams.get('filters[type]')).toEqual('audio');
  });
});
