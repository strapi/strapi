import { applyDefaultQueryTimeout } from '../knex';

describe('applyDefaultQueryTimeout', () => {
  const createQuery = (timeout?: number) => {
    const query: any = { _timeout: timeout };
    query.timeout = jest.fn((ms, opts) => {
      query._timeout = ms;
      query._cancelOnTimeout = opts?.cancel;
      return query;
    });
    return query;
  };

  const createDb = (queryTimeout?: number) => ({ config: { settings: { queryTimeout } } }) as any;

  it('leaves the query untouched when no queryTimeout is configured', () => {
    const query = createQuery();
    const db = createDb();

    const result = applyDefaultQueryTimeout(query, db);

    expect(query.timeout).not.toHaveBeenCalled();
    expect(result).toBe(query);
  });

  it('applies the configured timeout with cancellation enabled', () => {
    const query = createQuery();
    const db = createDb(5000);

    applyDefaultQueryTimeout(query, db);

    expect(query.timeout).toHaveBeenCalledWith(5000, { cancel: true });
  });

  it('does not override a timeout already set on the query', () => {
    const query = createQuery(1000);
    const db = createDb(5000);

    applyDefaultQueryTimeout(query, db);

    expect(query.timeout).not.toHaveBeenCalled();
  });
});
