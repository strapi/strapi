import { sortConnectArray } from '../relations-orderer';

describe('sortConnectArray', () => {
  test('sorts connect array', () => {
    const sortConnect = sortConnectArray([
      { id: 5, position: { before: 1 } },
      { id: 1, position: { before: 2 } },
      { id: 2, position: { end: true } },
      { id: 3, position: { after: 1 } },
    ]);

    expect(sortConnect).toMatchObject([
      { id: 2, position: { end: true } },
      { id: 1, position: { before: 2 } },
      { id: 5, position: { before: 1 } },
      { id: 3, position: { after: 1 } },
    ]);
  });

  test('sorts connect array with initial relations', () => {
    const sortConnect = sortConnectArray(
      [
        { id: 5, position: { before: 1 } },
        { id: 1, position: { before: 2 } },
        { id: 2, position: { end: true } },
        { id: 3, position: { after: 1 } },
      ],
      [{ id: 1 }]
    );

    expect(sortConnect).toMatchObject([
      { id: 5, position: { before: 1 } },
      { id: 2, position: { end: true } },
      { id: 1, position: { before: 2 } },
      { id: 3, position: { after: 1 } },
    ]);
  });

  test("error if position doesn't exist", () => {
    const sortConnect = () => sortConnectArray([{ id: 1, position: { after: 2 } }]);

    expect(sortConnect).toThrowError(
      'There was a problem connecting relation with id 1 at position {"after":2}. The relation with id 2 needs to be connected first.'
    );
  });

  test('error with circular references', () => {
    const sortConnect = () =>
      sortConnectArray(
        [
          { id: 2, position: { after: 1 } },
          { id: 3, position: { after: 1 } },
          { id: 1, position: { after: 3 } },
        ],
        []
      );

    expect(sortConnect).toThrowError(
      'A circular reference was found in the connect array. One relation is trying to connect before/after another one that is trying to connect before/after it'
    );
  });

  test('error when connecting same relation twice', () => {
    const sortConnect = () =>
      sortConnectArray(
        [
          { id: 1, position: { after: 2 } },
          { id: 1, position: { after: 3 } },
        ],
        []
      );

    expect(sortConnect).toThrowError(
      'The relation with id 1 is already connected. You cannot connect the same relation twice.'
    );
  });

  test('sorts a long chain of relations each connected before the next one', () => {
    const size = 20_000;
    // id 1 before id 2 before id 3 ... before id `size`, which is connected at the end
    const connect = Array.from({ length: size }, (_, idx) => ({
      id: idx + 1,
      position: idx + 1 === size ? { end: true as const } : { before: idx + 2 },
    }));

    const sortConnect = sortConnectArray(connect);

    expect(sortConnect.map(({ id }) => id)).toEqual(
      Array.from({ length: size }, (_, idx) => size - idx)
    );
  });

  test('detects a circular reference in a long chain', () => {
    const size = 20_000;
    const connect = Array.from({ length: size }, (_, idx) => ({
      id: idx + 1,
      position: { before: idx + 1 === size ? 1 : idx + 2 },
    }));

    expect(() => sortConnectArray(connect)).toThrowError(
      'A circular reference was found in the connect array.'
    );
  });
});
