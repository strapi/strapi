/* eslint-disable check-file/filename-naming-convention */
import { JSX } from 'react';

import { ContentManagerPlugin, DocumentActionComponent, PanelComponent } from '../content-manager';

jest.mock('../pages/EditView/components/Panels', () => ({
  ActionsPanel: () => ({
    title: 'Actions',
    content: null,
    type: 'actions',
  }),
}));

jest.mock('../pages/EditView/components/DocumentActions', () => ({
  DEFAULT_ACTIONS: [],
}));

jest.mock('../pages/EditView/components/Header', () => ({
  DEFAULT_HEADER_ACTIONS: [],
}));

jest.mock('../pages/EditView/components/Header', () => ({
  DEFAULT_HEADER_ACTIONS: [],
}));

jest.mock('../pages/ListView/components/TableActions', () => ({
  DEFAULT_TABLE_ROW_ACTIONS: [],
}));

jest.mock('../pages/ListView/components/BulkActions/Actions', () => ({
  DEFAULT_BULK_ACTIONS: [],
}));

describe('content-manager', () => {
  describe('config', () => {
    it("should export the a config shape to pretend it's a plugin", () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.config).toEqual({
        apis: {
          addBulkAction: expect.any(Function),
          addDocumentAction: expect.any(Function),
          addDocumentHeaderAction: expect.any(Function),
          addEditViewSidePanel: expect.any(Function),
          addRichTextBlocks: expect.any(Function),
          getBulkActions: expect.any(Function),
          getDocumentActions: expect.any(Function),
          getEditViewSidePanels: expect.any(Function),
          getHeaderActions: expect.any(Function),
          getRichTextBlocks: expect.any(Function),
        },
        id: 'content-manager',
        injectionZones: {
          editView: {
            informations: [],
            'right-links': [],
          },
          listView: {
            actions: [],
            deleteModalAdditionalInfos: [],
            publishModalAdditionalInfos: [],
            unpublishModalAdditionalInfos: [],
          },
          preview: {
            actions: [],
          },
        },
        name: 'Content Manager',
      });
    });

    /**
     * This test will help you ensure you don't remove any API
     * because they're public facing. You can of course add new ones.
     */
    it('should export only these APIs', () => {
      const plugin = new ContentManagerPlugin();

      expect(Object.keys(plugin.config.apis ?? {})).toEqual([
        'addBulkAction',
        'addDocumentAction',
        'addDocumentHeaderAction',
        'addEditViewSidePanel',
        'addRichTextBlocks',
        'getBulkActions',
        'getDocumentActions',
        'getEditViewSidePanels',
        'getHeaderActions',
        'getRichTextBlocks',
      ]);
    });
  });

  describe('addEditViewSidePanel', () => {
    it('should let users add a panel description as an array', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.editViewSidePanels).toHaveLength(1);

      // ensure we have our default options
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toEqual([undefined]);

      plugin.addEditViewSidePanel([
        () => ({
          title: 'test',
          content: null,
        }),
      ]);

      expect(plugin.editViewSidePanels).toHaveLength(2);
      // ensure we have our default options, with the new option, which will not have a type
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toEqual([undefined, undefined]);
    });

    it('should let you mutate the existing array of panels with a reducer function', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.editViewSidePanels).toHaveLength(1);

      // ensure we have our default options
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toEqual([undefined]);

      const panel: PanelComponent = () => ({ title: 'test', content: null });

      plugin.addEditViewSidePanel((prev) => [...prev, panel]);

      expect(plugin.editViewSidePanels).toHaveLength(2);
      // ensure we have our default options, with the new option, which will not have a type. The defaults should still be at the front.
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toEqual([undefined, undefined]);

      plugin.addEditViewSidePanel((prev) => prev.slice(1));

      expect(plugin.editViewSidePanels).toHaveLength(1);
      // We should be missing our "1st" panel, the actions panel
      expect(plugin.editViewSidePanels.map((panel) => panel.type)).toEqual([undefined]);
    });

    it("should throw an error if you've not passed a function or an array", () => {
      const plugin = new ContentManagerPlugin();

      // @ts-expect-error – testing it fails.
      expect(() => plugin.addEditViewSidePanel('I will break')).toThrowError(
        'Expected the `panels` passed to `addEditViewSidePanel` to be an array or a function, but received string'
      );
    });

    it("should throw a clear error if an item in the array isn't a function", () => {
      const plugin = new ContentManagerPlugin();

      expect(() =>
        // @ts-expect-error – testing it fails.
        plugin.addEditViewSidePanel([{ title: 'test', content: null }])
      ).toThrowError(
        'Expected every item in the `panels` array passed to `addEditViewSidePanel` to be a function that returns a description object, but received object at index 0'
      );
    });
  });

  describe('addDocumentAction', () => {
    it('should let users add a document action as an array', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.documentActions).toHaveLength(0);

      // ensure we have our default options
      expect(plugin.documentActions.map((action) => action.type)).toEqual([]);

      plugin.addDocumentAction([
        () => ({
          label: 'Publish & Notify Twitter',
          disabled: false,
          onClick: () => {},
        }),
      ]);

      expect(plugin.documentActions).toHaveLength(1);
      // ensure we have our default options, with the new option, which will not have a type
      expect(plugin.documentActions.map((action) => action.type)).toEqual([undefined]);
    });

    it('should let you mutate the existing array of panels with a reducer function', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.documentActions).toHaveLength(0);

      // ensure we have our default options
      expect(plugin.documentActions.map((action) => action.type)).toEqual([]);

      const action: DocumentActionComponent = () => ({
        label: 'Publish & Notify Twitter',
        disabled: false,
        onClick: () => {},
      });

      plugin.addDocumentAction((prev) => [...prev, action]);

      expect(plugin.documentActions).toHaveLength(1);
      // ensure we have our default options, with the new option, which will not have a type. The defaults should still be at the front.
      expect(plugin.documentActions.map((action) => action.type)).toEqual([undefined]);

      plugin.addDocumentAction((prev) => prev.filter((action) => action.type !== 'history'));

      expect(plugin.documentActions).toHaveLength(1);
      // We should be missing our "1st" panel, the actions panel
      expect(plugin.documentActions.map((action) => action.type)).toEqual([undefined]);
    });

    it("should throw an error if you've not passed a function or an array", () => {
      const plugin = new ContentManagerPlugin();

      // @ts-expect-error – testing it fails.
      expect(() => plugin.addDocumentAction('I will break')).toThrowError(
        'Expected the `actions` passed to `addDocumentAction` to be an array or a function, but received string'
      );
    });

    it("should throw a clear error if an item in the array isn't a function", () => {
      const plugin = new ContentManagerPlugin();

      expect(() =>
        // @ts-expect-error – testing it fails.
        plugin.addDocumentAction([{ label: 'Publish & Notify Twitter', onClick: () => {} }])
      ).toThrowError(
        'Expected every item in the `actions` array passed to `addDocumentAction` to be a function that returns a description object, but received object at index 0'
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
      ).toThrowError(
        'Expected the `actions` passed to `addDocumentHeaderAction` to be an array or a function, but received string'
      );
    });

    it("should throw a clear error if an item in the array isn't a function", () => {
      const plugin = new ContentManagerPlugin();

      expect(() =>
        // @ts-expect-error – testing it fails.
        plugin.addDocumentHeaderAction([{ label: 'Notify Twitter', onClick: () => {} }])
      ).toThrowError(
        'Expected every item in the `actions` array passed to `addDocumentHeaderAction` to be a function that returns a description object, but received object at index 0'
      );
    });
  });

  describe('addBulkAction', () => {
    it('should let users add a bulk action as an array', () => {
      const plugin = new ContentManagerPlugin();

      expect(plugin.bulkActions).toHaveLength(0);

      plugin.addBulkAction([
        () => ({
          label: 'Dummy Bulk Action',
          onClick: () => {},
        }),
      ]);

      expect(plugin.bulkActions).toHaveLength(1);
    });

    it("should throw an error if you've not passed a function or an array", () => {
      const plugin = new ContentManagerPlugin();

      expect(() =>
        // @ts-expect-error – testing it fails.
        plugin.addBulkAction('I will break')
      ).toThrowError(
        'Expected the `actions` passed to `addBulkAction` to be an array or a function, but received string'
      );
    });

    it("should throw a clear error if an item in the array isn't a function", () => {
      const plugin = new ContentManagerPlugin();

      expect(() =>
        // @ts-expect-error – testing it fails.
        plugin.addBulkAction([{ label: 'Dummy Bulk Action', onClick: () => {} }])
      ).toThrowError(
        'Expected every item in the `actions` array passed to `addBulkAction` to be a function that returns a description object, but received object at index 0'
      );
    });
  });

  describe('addRichTextBlocks', () => {
    it('should let users add a new block with objects keys', () => {
      const plugin = new ContentManagerPlugin();

      plugin.addRichTextBlocks({
        customBlock: {
          isInBlocksSelector: true,
          renderElement: () => null as unknown as JSX.Element,
          matchNode: (node) => node.type === 'customBlock',
          label: { defaultMessage: 'Custom Block' },
        },
      });

      expect(plugin.richTextBlocksStore).toHaveProperty('customBlock');
    });

    it('should let users add a new block with a function', () => {
      const plugin = new ContentManagerPlugin();

      plugin.addRichTextBlocks((prev) => ({
        ...prev,
        customBlock: {
          isInBlocksSelector: true,
          renderElement: () => null as unknown as JSX.Element,
          matchNode: (node) => node.type === 'customBlock',
          label: { defaultMessage: 'Custom Block' },
        },
      }));

      expect(plugin.richTextBlocksStore).toHaveProperty('customBlock');
    });

    it('should let users remove a block with a function', () => {
      const plugin = new ContentManagerPlugin();

      plugin.addRichTextBlocks({
        customBlock: {
          isInBlocksSelector: true,
          renderElement: () => null as unknown as JSX.Element,
          matchNode: (node) => node.type === 'customBlock',
          label: { defaultMessage: 'Custom Block' },
        },
      });

      expect(plugin.richTextBlocksStore).toHaveProperty('customBlock');

      plugin.addRichTextBlocks((prev) => {
        delete prev.customBlock;
        return prev;
      });

      expect(plugin.richTextBlocksStore).not.toHaveProperty('customBlock');
    });

    it('should let users change an existing block', () => {
      const plugin = new ContentManagerPlugin();

      plugin.addRichTextBlocks({
        customBlock: {
          isInBlocksSelector: true,
          renderElement: () => null as unknown as JSX.Element,
          matchNode: (node) => node.type === 'customBlock',
          label: { defaultMessage: 'Custom Block' },
        },
      });

      expect(plugin.richTextBlocksStore.customBlock).toHaveProperty('label', {
        defaultMessage: 'Custom Block',
      });

      plugin.addRichTextBlocks((prev) => ({
        ...prev,
        customBlock: {
          ...prev.customBlock,
          label: { defaultMessage: 'New Custom Block' },
        },
      }));

      expect(plugin.richTextBlocksStore.customBlock).toHaveProperty('label', {
        defaultMessage: 'New Custom Block',
      });
    });

    it('should throw an error if you pass an invalid object', () => {
      const plugin = new ContentManagerPlugin();

      expect(() =>
        // @ts-expect-error – testing it fails.
        plugin.addRichTextBlocks('I will break')
      ).toThrowErrorMatchingInlineSnapshot(
        `"Expected the \`blocks\` passed to \`addRichTextBlocks\` to be an object or a function, but received string"`
      );
    });

    it('should throw an error if you pass an invalid function', () => {
      const plugin = new ContentManagerPlugin();

      expect(() =>
        // @ts-expect-error – testing it fails.
        plugin.addRichTextBlocks(() => 'I will break')
      ).toThrowErrorMatchingInlineSnapshot(
        `"Expected the \`blocks\` passed to \`addRichTextBlocks\` to be an object or a function, but received string"`
      );
    });
  });
});
