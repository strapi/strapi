'use strict';

const relationsOrderer = require('../relations-orderer');

describe('relations orderer', () => {
  test('connect at the end', () => {
    const orderer = relationsOrderer(
      [
        { id: 2, order: 4 },
        { id: 3, order: 10 },
      ],
      'id',
      'order'
    );

    orderer.connect([{ id: 4, position: { end: true } }, { id: 5 }]);

    expect(orderer.get()).toMatchObject([
      { id: 2, order: 4 },
      { id: 3, order: 10 },
      { id: 4, order: 10.5 },
      { id: 5, order: 10.5 },
    ]);
  });

  test('connect at the start', () => {
    const orderer = relationsOrderer(
      [
        { id: 2, order: 4 },
        { id: 3, order: 10 },
      ],
      'id',
      'order'
    );

    orderer.connect([{ id: 4, position: { start: true } }]);

    expect(orderer.get()).toMatchObject([
      { id: 4, order: 0.5 },
      { id: 2, order: 4 },
      { id: 3, order: 10 },
    ]);
  });

  test('connect multiple relations', () => {
    const orderer = relationsOrderer(
      [
        { id: 2, order: 4 },
        { id: 3, order: 10 },
      ],
      'id',
      'order'
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

  test('connect with no initial relations', () => {
    const orderer = relationsOrderer([], 'id', 'order');

    orderer.connect([
      { id: 1, position: { start: true } },
      { id: 2, position: { start: true } },
      { id: 3, position: { after: 1 } },
      { id: 1, position: { after: 2 } },
    ]);

    expect(orderer.get()).toMatchObject([
      { id: 2, order: 0.5 },
      { id: 1, order: 0.5 },
      { id: 3, order: 0.5 },
    ]);
  });
});
