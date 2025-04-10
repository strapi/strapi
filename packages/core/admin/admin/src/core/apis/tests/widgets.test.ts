import { Widgets, type WidgetArgs } from '../Widgets';

describe('Widgets', () => {
  let widgets: Widgets;

  beforeEach(() => {
    widgets = new Widgets();
  });

  const mockWidget: WidgetArgs = {
    id: 'test-widget',
    component: () => Promise.resolve({ default: () => null }),
    title: { id: 'test.title', defaultMessage: 'Test Title' },
    icon: () => null,
  };

  describe('register', () => {
    test('registers a single widget correctly', () => {
      widgets.register(mockWidget);
      const registeredWidgets = widgets.getAll();
      expect(registeredWidgets[`global::${mockWidget.id}`]).toBe(mockWidget);
    });

    test('registers a plugin widget correctly', () => {
      const pluginWidget = { ...mockWidget, pluginId: 'test-plugin' };
      widgets.register(pluginWidget);
      const registeredWidgets = widgets.getAll();
      expect(registeredWidgets[`plugin::${pluginWidget.pluginId}.${pluginWidget.id}`]).toBe(
        pluginWidget
      );
    });

    test('registers multiple widgets', () => {
      const secondWidget = {
        ...mockWidget,
        id: 'second-widget',
      };
      widgets.register([mockWidget, secondWidget]);
      const registeredWidgets = widgets.getAll();
      expect(registeredWidgets[`global::${mockWidget.id}`]).toBe(mockWidget);
      expect(registeredWidgets[`global::${secondWidget.id}`]).toBe(secondWidget);
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
    test('returns empty object when no widgets registered', () => {
      expect(widgets.getAll()).toEqual({});
    });

    test('returns all registered widgets', () => {
      widgets.register(mockWidget);
      const registeredWidgets = widgets.getAll();
      expect(Object.keys(registeredWidgets)).toHaveLength(1);
      expect(registeredWidgets[`global::${mockWidget.id}`]).toBe(mockWidget);
    });
  });
});
