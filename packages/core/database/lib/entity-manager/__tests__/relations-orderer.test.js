'use strict';

const { relationsOrderer } = require('../relations-orderer');

describe('Given I have some relations in the database', () => {
  describe('When I connect a relation at the end', () => {
    test('Then it is placed at the end with the correct order', () => {
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
  });

  describe('When I connect a relation at the start', () => {
    test('Then it is placed at the start with the correct order', () => {
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
  });

  describe('When I connect multiple relations using before', () => {
    test('Then they are correctly ordered', () => {
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
  });

  describe('When you connect multiple disordered relations', () => {
    test('Then they are correctly ordered', () => {
      const orderer = relationsOrderer(
        [
          { id: 1, order: 1 },
          { id: 2, order: 2 },
          { id: 3, order: 3 },
        ],
        'id',
        'order'
      );

      orderer.connect([
        { id: 5, position: { before: 1 } },
        { id: 1, position: { before: 2 } },
        { id: 2, position: { end: true } },
      ]);

      expect(orderer.get()).toMatchObject([
        { id: 5, order: 0.5 },
        { id: 1, order: 1.5 },
        { id: 3, order: 3 },
        { id: 2, order: 3.5 },
      ]);
    });
  });
});

describe('Given there are no relations in the database', () => {
  describe('When you connect multiple new relations', () => {
    test('Then they are correctly ordered', () => {
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

  describe('When you connect multiple disordered relations', () => {
    test('Then they are correctly ordered', () => {
      const orderer = relationsOrderer([], 'id', 'order');

      orderer.connect([
        { id: 5, position: { before: 1 } },
        { id: 1, position: { before: 2 } },
        { id: 2, position: { end: true } },
        { id: 3, position: { after: 1 } },
      ]);

      expect(orderer.get()).toMatchObject([
        { id: 5, order: 0.5 },
        { id: 1, order: 0.5 },
        { id: 3, order: 0.5 },
        { id: 2, order: 0.5 },
      ]);
    });
  });
});
