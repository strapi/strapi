/* eslint-disable check-file/filename-naming-convention */
import { ContentManagerPlugin, DocumentActionComponent, PanelComponent } from '../content-manager';

describe('content-manager', () => {
  describe('config', () => {
    it("should export the a config shape to pretend it's a plugin", () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.config).toMatchInlineSnapshot(`
        {
          "apis": {
            "addDocumentAction": [Function],
            "addDocumentHeaderAction": [Function],
            "addEditViewSidePanel": [Function],
            "getDocumentActions": [Function],
            "getEditViewSidePanels": [Function],
            "getHeaderActions": [Function],
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
          "addDocumentAction",
          "addDocumentHeaderAction",
          "addEditViewSidePanel",
          "getDocumentActions",
          "getHeaderActions",
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

  describe('addDocumentAction', () => {
    it('should let users add a document action as an array', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.documentActions).toHaveLength(10);

      // ensure we have our default options
      expect(plugin.documentActions.map((action) => action.type)).toMatchInlineSnapshot(`
        [
          "publish",
          "update",
          "unpublish",
          "discard",
          "edit",
          "clone",
          "edit-the-model",
          "configure-the-view",
          "delete",
          "history",
        ]
      `);

      plugin.addDocumentAction([
        () => ({
          label: 'Publish & Notify Twitter',
          disabled: false,
          onClick: () => {},
        }),
      ]);

      expect(plugin.documentActions).toHaveLength(11);
      // ensure we have our default options, with the new option, which will not have a type
      expect(plugin.documentActions.map((action) => action.type)).toMatchInlineSnapshot(`
        [
          "publish",
          "update",
          "unpublish",
          "discard",
          "edit",
          "clone",
          "edit-the-model",
          "configure-the-view",
          "delete",
          "history",
          undefined,
        ]
      `);
    });

    it('should let you mutate the existing array of panels with a reducer function', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.documentActions).toHaveLength(10);

      // ensure we have our default options
      expect(plugin.documentActions.map((action) => action.type)).toMatchInlineSnapshot(`
        [
          "publish",
          "update",
          "unpublish",
          "discard",
          "edit",
          "clone",
          "edit-the-model",
          "configure-the-view",
          "delete",
          "history",
        ]
      `);

      const action: DocumentActionComponent = () => ({
        label: 'Publish & Notify Twitter',
        disabled: false,
        onClick: () => {},
      });

      plugin.addDocumentAction((prev) => [...prev, action]);

      expect(plugin.documentActions).toHaveLength(11);
      // ensure we have our default options, with the new option, which will not have a type. The defaults should still be at the front.
      expect(plugin.documentActions.map((action) => action.type)).toMatchInlineSnapshot(`
        [
          "publish",
          "update",
          "unpublish",
          "discard",
          "edit",
          "clone",
          "edit-the-model",
          "configure-the-view",
          "delete",
          "history",
          undefined,
        ]
      `);

      plugin.addDocumentAction((prev) =>
        prev.filter((action) => action.type !== 'publish' && action.type !== 'update')
      );

      expect(plugin.documentActions).toHaveLength(9);
      // We should be missing our "1st" panel, the actions panel
      expect(plugin.documentActions.map((action) => action.type)).toMatchInlineSnapshot(`
        [
          "unpublish",
          "discard",
          "edit",
          "clone",
          "edit-the-model",
          "configure-the-view",
          "delete",
          "history",
          undefined,
        ]
      `);
    });

    it("should throw an error if you've not passed a function or an array", () => {
      const plugin = new ContentManagerPlugin();

      // @ts-expect-error – testing it fails.
      expect(() => plugin.addDocumentAction('I will break')).toThrowErrorMatchingInlineSnapshot(
        `"Expected the \`actions\` passed to \`addDocumentAction\` to be an array or a function, but received string"`
      );
    });
  });

  describe('addDocumentHeaderAction', () => {
    it('should let users add a document action as an array', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.headerActions).toHaveLength(0);

      plugin.addDocumentHeaderAction([
        () => ({
          label: 'Notify Twitter',
          disabled: false,
          onClick: () => {},
        }),
      ]);

      expect(plugin.headerActions).toHaveLength(1);
    });

    it("should throw an error if you've not passed a function or an array", () => {
      const plugin = new ContentManagerPlugin();

      expect(() =>
        // @ts-expect-error – testing it fails.
        plugin.addDocumentHeaderAction('I will break')
      ).toThrowErrorMatchingInlineSnapshot(
        `"Expected the \`actions\` passed to \`addDocumentHeaderAction\` to be an array or a function, but received string"`
      );
    });
  });
});
