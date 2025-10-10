/* eslint-disable @typescript-eslint/ban-ts-comment */
import { getRelationType } from '../getRelationType';

describe('CTB | utils | getRelationType', () => {
  it('Should return oneWay', () => {
    const relation = 'oneToOne';

    expect(getRelationType(relation, null)).toEqual('oneWay');
    expect(getRelationType(relation, undefined)).toEqual('oneWay');
  });

  it('Should return manyWay', () => {
    const relation = 'oneToMany';

    expect(getRelationType(relation, null)).toEqual('manyWay');
    expect(getRelationType(relation, undefined)).toEqual('manyWay');
  });

  it('Should return the relation when the target attribute is defined', () => {
    const relation = 'test';
    // @ts-expect-error
    expect(getRelationType(relation, 'test')).toEqual('test');
    // @ts-expect-error
    expect(getRelationType(relation, 'test')).toEqual('test');
  });
});
