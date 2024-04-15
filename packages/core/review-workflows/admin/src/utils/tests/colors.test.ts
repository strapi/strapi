import { getStageColorByHex } from '../colors';

describe('colors', () => {
  test('getStageColorByHex()', () => {
    expect(getStageColorByHex('#4945ff')).toStrictEqual({
      name: 'Blue',
      themeColorName: 'primary600',
    });

    expect(getStageColorByHex('#4945FF')).toStrictEqual({
      name: 'Blue',
      themeColorName: 'primary600',
    });

    expect(getStageColorByHex('random')).toStrictEqual(null);
  });
});
