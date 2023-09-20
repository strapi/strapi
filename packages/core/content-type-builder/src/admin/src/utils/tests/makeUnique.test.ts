import makeUnique from '../makeUnique';

describe('CTB | utils | makeUnique', () => {
  it('Should remove the duplicate elements', () => {
    const data = ['a', 'b', 'c', 'aa', 'a', 'bb', 'b'];
    const expected = ['a', 'b', 'c', 'aa', 'bb'];

    expect(makeUnique(data)).toEqual(expected);
  });
});
