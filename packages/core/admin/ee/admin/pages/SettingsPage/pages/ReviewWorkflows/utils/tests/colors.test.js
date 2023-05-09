import { getAvailableStageColors, getStageColorByHex } from '../colors';

describe('Settings | Review Workflows | colors', () => {
  test('getAvailableStageColors()', () => {
    const colors = getAvailableStageColors();

    expect(colors.length).toBe(14);

    colors.forEach((color) => {
      expect(color).toMatchObject({
        hex: expect.any(String),
        name: expect.any(String),
      });

      expect(color.hex).toBe(color.hex.toUpperCase());
    });
  });

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
    expect(getStageColorByHex()).toStrictEqual(null);
  });
});
