import { lightTheme } from '@strapi/design-system';
import { DefaultTheme } from 'styled-components';

import { STAGE_COLORS } from '../constants';

export function getStageColorByHex(hex: string) {
  if (!hex) {
    return null;
  }

  // there are multiple colors with the same hex code in the design tokens. In order to find
  // the correct one we have to find all matching colors and then check, which ones are usable
  // for stages.
  const themeColors: [string, (keyof typeof STAGE_COLORS)[]][] = Object.entries(
    lightTheme.colors
  ).filter(([, value]) => value.toUpperCase() === hex.toUpperCase());

  const themeColorName = themeColors.reduce((acc, [name]) => {
    if (STAGE_COLORS?.[name]) {
      acc = name;
    }

    return acc;
  }, null as keyof typeof STAGE_COLORS | null);

  if (!themeColorName) {
    return null;
  }

  return {
    themeColorName,
    name: STAGE_COLORS[themeColorName],
  };
}

export function getAvailableStageColors() {
  return Object.entries(STAGE_COLORS).map(([themeColorName, name]) => ({
    hex: lightTheme.colors[themeColorName as keyof DefaultTheme['colors']].toUpperCase(),
    name,
  }));
}
