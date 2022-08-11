import isSingleRelation from '../isSingleRelation';

describe('isSingleRelation', () => {
  ['oneToOne', 'manyToOne', 'oneToOneMorph'].forEach((type) => {
    test(`is single relation: ${type}`, () => {
      expect(isSingleRelation(type)).toBeTruthy();
    });
  });

  test('is not single relation', () => {
    expect(isSingleRelation('manyToMany')).toBeFalsy();
  });
});
