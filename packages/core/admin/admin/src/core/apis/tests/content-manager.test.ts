/* eslint-disable check-file/filename-naming-convention */
import { ContentManagerPlugin, PanelComponent } from '../content-manager';

describe('content-manager', () => {
  describe('config', () => {
    it("should export the a config shape to pretend it's a plugin", () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.config).toMatchInlineSnapshot(`
        {
          "apis": {
            "addEditViewSidePanel": [Function],
            "getEditViewSidePanels": [Function],
          },
          "id": "content-manager",
          "name": "Content Manager",
        }
      `);
    });

    /**
     * This test will help you ensure you don't remove any API
     * because they're public facing. You can of course add new ones.
     */
    it('should export only these APIs', () => {
      const plugin = new ContentManagerPlugin();

      expect(Object.keys(plugin.config.apis ?? {})).toMatchInlineSnapshot(`
        [
          "addEditViewSidePanel",
          "getEditViewSidePanels",
        ]
      `);
    });
  });

  describe('addEditViewSidePanel', () => {
    it('should let users add a panel description as an array', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.editViewSidePanels).toHaveLength(2);

      // ensure we have our default options
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toMatchInlineSnapshot(`
        [
          "actions",
          "review-workflows",
        ]
      `);

      plugin.addEditViewSidePanel([
        () => ({
          title: 'test',
          content: null,
        }),
      ]);

      expect(plugin.editViewSidePanels).toHaveLength(3);
      // ensure we have our default options, with the new option, which will not have a type
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toMatchInlineSnapshot(`
        [
          "actions",
          "review-workflows",
          undefined,
        ]
      `);
    });

    it('should let you mutate the existing array of panels with a reducer function', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.editViewSidePanels).toHaveLength(2);

      // ensure we have our default options
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toMatchInlineSnapshot(`
        [
          "actions",
          "review-workflows",
        ]
      `);

      const panel: PanelComponent = () => ({ title: 'test', content: null });

      plugin.addEditViewSidePanel((prev) => [...prev, panel]);

      expect(plugin.editViewSidePanels).toHaveLength(3);
      // ensure we have our default options, with the new option, which will not have a type. The defaults should still be at the front.
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toMatchInlineSnapshot(`
        [
          "actions",
          "review-workflows",
          undefined,
        ]
      `);

      plugin.addEditViewSidePanel((prev) => prev.filter((panel) => panel.type !== 'actions'));

      expect(plugin.editViewSidePanels).toHaveLength(2);
      // We should be missing our "1st" panel, the actions panel
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toMatchInlineSnapshot(`
        [
          "review-workflows",
          undefined,
        ]
      `);
    });

    it("should throw an error if you've not passed a function or an array", () => {
      const plugin = new ContentManagerPlugin();

      // @ts-expect-error – testing it fails.
      expect(() => plugin.addEditViewSidePanel('I will break')).toThrowErrorMatchingInlineSnapshot(
        `"Expected the \`panels\` passed to \`addEditViewSidePanel\` to be an array or a function, but received string"`
      );
    });
  });
});
