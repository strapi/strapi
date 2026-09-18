import { getComponentLayout } from '../InputRenderer';

import type { EditLayout } from '../../../../hooks/useDocumentLayout';

describe('getComponentLayout', () => {
  test('returns an empty layout while the component configuration is unavailable', () => {
    expect(getComponentLayout({} as EditLayout['components'], 'shared.missing')).toEqual([]);
  });

  test('returns the resolved component layout when it is available', () => {
    const layout = [] as EditLayout['components'][string]['layout'];
    const components = {
      'shared.resolved': {
        layout,
        settings: {},
      },
    } as EditLayout['components'];

    expect(getComponentLayout(components, 'shared.resolved')).toBe(layout);
  });
});
