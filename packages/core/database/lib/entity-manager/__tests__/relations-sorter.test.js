'use strict';

const relationsOrderer = require('../relations-sorter');

describe('relations orderer', () => {
  test('connect at the end', () => {
    const orderer = relationsOrderer([{ id: 2, order: 4 }], 'id', 'order', 10);

    orderer.connect([{ id: 4, position: { end: true } }, { id: 5 }]);

    expect(orderer.get()).toMatchObject([
      { id: 2, order: 4 },
      { id: 4, order: 10.5 },
      { id: 5, order: 10.5 },
    ]);
  });

  test('connect at the start', () => {
    const orderer = relationsOrderer([{ id: 2, order: 4 }], 'id', 'order', 10);

    orderer.connect([{ id: 4, position: { start: true } }]);

    expect(orderer.get()).toMatchObject([
      { id: 4, order: 0.5 },
      { id: 2, order: 4 },
    ]);
  });

  test('connect multiple relations', () => {
    const orderer = relationsOrderer(
      [
        { id: 2, order: 4 },
        { id: 3, order: 10 },
      ],
      'id',
      'order',
      10
    );

    orderer.connect([
      { id: 4, position: { before: 2 } },
      { id: 4, position: { before: 3 } },
      { id: 5, position: { before: 4 } },
    ]);

    expect(orderer.get()).toMatchObject([
      { id: 2, order: 4 },
      { id: 5, order: 9.5 },
      { id: 4, order: 9.5 },
      { id: 3, order: 10 },
    ]);
  });
});
