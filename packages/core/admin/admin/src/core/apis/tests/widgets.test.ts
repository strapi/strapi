import { PuzzlePiece } from '@strapi/icons';

import { Widgets, type WidgetArgs } from '../Widgets';

describe('Widgets', () => {
  let widgets: Widgets;

  beforeEach(() => {
    widgets = new Widgets();
  });

  const mockWidget: WidgetArgs = {
    id: 'test-widget',
    component: () => Promise.resolve(() => null),
    title: { id: 'test.title', defaultMessage: 'Test Title' },
    icon: PuzzlePiece,
  };

  describe('register', () => {
    test('registers a single widget correctly', () => {
      widgets.register(mockWidget);
      const registeredWidgets = widgets.getAll();

      expect(registeredWidgets).toHaveLength(1);
      expect(registeredWidgets[0]).toEqual({
        component: mockWidget.component,
        title: mockWidget.title,
        icon: mockWidget.icon,
        uid: `global::${mockWidget.id}`,
      });
    });

    test('registers a plugin widget correctly', () => {
      const pluginWidget = { ...mockWidget, pluginId: 'test-plugin' };
      widgets.register(pluginWidget);
      const registeredWidgets = widgets.getAll();

      expect(registeredWidgets).toHaveLength(1);
      expect(registeredWidgets[0]).toEqual({
        component: pluginWidget.component,
        title: pluginWidget.title,
        icon: pluginWidget.icon,
        uid: `plugin::${pluginWidget.pluginId}.${pluginWidget.id}`,
      });
    });

    test('registers multiple widgets', () => {
      const secondWidget = {
        ...mockWidget,
        id: 'second-widget',
      };
      widgets.register([mockWidget, secondWidget]);
      const registeredWidgets = widgets.getAll();

      expect(registeredWidgets).toHaveLength(2);
      expect(registeredWidgets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ uid: `global::${mockWidget.id}` }),
          expect.objectContaining({ uid: `global::${secondWidget.id}` }),
        ])
      );
    });

    test('throws when id is missing', () => {
      const invalidWidget = { ...mockWidget, id: undefined };
      expect(() => widgets.register(invalidWidget as any)).toThrow('An id must be provided');
    });

    test('throws when component is missing', () => {
      const invalidWidget = { ...mockWidget, component: undefined };
      expect(() => widgets.register(invalidWidget as any)).toThrow('A component must be provided');
    });

    test('throws when title is missing', () => {
      const invalidWidget = { ...mockWidget, title: undefined };
      expect(() => widgets.register(invalidWidget as any)).toThrow('A title must be provided');
    });

    test('throws when icon is missing', () => {
      const invalidWidget = { ...mockWidget, icon: undefined };
      expect(() => widgets.register(invalidWidget as any)).toThrow('An icon must be provided');
    });
  });

  describe('getAll', () => {
    test('returns empty array when no widgets registered', () => {
      expect(widgets.getAll()).toEqual([]);
    });

    test('returns all registered widgets as an array', () => {
      widgets.register(mockWidget);
      const registeredWidgets = widgets.getAll();

      expect(Array.isArray(registeredWidgets)).toBe(true);
      expect(registeredWidgets).toHaveLength(1);
      expect(registeredWidgets[0]).toEqual({
        component: mockWidget.component,
        title: mockWidget.title,
        icon: mockWidget.icon,
        uid: `global::${mockWidget.id}`,
      });
    });
  });
});
