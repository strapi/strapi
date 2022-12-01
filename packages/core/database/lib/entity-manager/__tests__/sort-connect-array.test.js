'use strict';

const { sortConnectArray } = require('../relations-orderer');

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
});
