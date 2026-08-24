/* eslint-disable check-file/filename-naming-convention */

import { INJECTION_ZONES } from './components/InjectionZone';
import { PLUGIN_ID } from './constants/plugin';
import {
  DEFAULT_ACTIONS,
  type DocumentActionPosition,
  type DocumentActionDescription,
} from './pages/EditView/components/DocumentActions';
import { RichTextBlocksStore } from './pages/EditView/components/FormInputs/BlocksInput/BlocksEditor';
import { defaultBlocksStore } from './pages/EditView/components/FormInputs/BlocksInput/DefaultBlocksStore';
import {
  DEFAULT_HEADER_ACTIONS,
  type HeaderActionDescription,
} from './pages/EditView/components/Header';
import { ActionsPanel, type PanelDescription } from './pages/EditView/components/Panels';
import {
  DEFAULT_BULK_ACTIONS,
  type BulkActionDescription,
} from './pages/ListView/components/BulkActions/Actions';
import { DEFAULT_TABLE_ROW_ACTIONS } from './pages/ListView/components/TableActions';

import type { Document } from './hooks/useDocument';
import type { DocumentMetadata } from '../../shared/contracts/collection-types';
import type { DescriptionComponent, PluginConfig } from '@strapi/admin/strapi-admin';

/* -------------------------------------------------------------------------------------------------
 * Configuration Types
 * -----------------------------------------------------------------------------------------------*/

type DescriptionReducer<Config extends object> = (prev: Config[]) => Config[];
type DescriptionObjReducer<Config extends object> = (prev: Config) => Config;

interface EditViewContext {
  /**
   * This will ONLY be null, if the content-type
   * does not have draft & published enabled.
   */
  activeTab: 'draft' | 'published' | null;
  /**
   * Will be either 'single-types' | 'collection-types'
   */
  collectionType: string;
  /**
   * this will be undefined if someone is creating an entry.
   */
  document?: Document;
  /**
   * this will be undefined if someone is creating an entry.
   */
  documentId?: string;
  /**
   * this will be undefined if someone is creating an entry.
   */
  meta?: DocumentMetadata;
  /**
   * The current content-type's model.
   */
  model: string;
}

interface ListViewContext {
  /**
   * Will be either 'single-types' | 'collection-types'
   */
  collectionType: string;
  /**
   * The current selected documents in the table
   */
  documents: Document[];
  /**
   * The current content-type's model.
   */
  model: string;
}

interface PanelComponentProps extends EditViewContext {}

interface PanelComponent extends DescriptionComponent<PanelComponentProps, PanelDescription> {
  /**
   * The defaults are added by Strapi only, if you're providing your own component,
   * you do not need to provide this.
   */
  type?: 'actions' | 'releases';
}

interface DocumentActionProps extends EditViewContext {}

interface DocumentActionComponent
  extends DescriptionComponent<DocumentActionProps, DocumentActionDescription> {
  type?:
    | 'clone'
    | 'configure-the-view'
    | 'delete'
    | 'discard'
    | 'edit'
    | 'edit-the-model'
    | 'history'
    | 'publish'
    | 'unpublish'
    | 'update';
  position?: DocumentActionDescription['position'];
}

interface HeaderActionProps extends EditViewContext {}

interface HeaderActionComponent
  extends DescriptionComponent<HeaderActionProps, HeaderActionDescription> {}

interface BulkActionComponentProps extends ListViewContext {}

interface BulkActionComponent
  extends DescriptionComponent<BulkActionComponentProps, BulkActionDescription> {
  type?: 'delete' | 'publish' | 'unpublish';
}

/* -------------------------------------------------------------------------------------------------
 * ContentManager plugin
 * -----------------------------------------------------------------------------------------------*/

class ContentManagerPlugin {
  /**
   * The following properties are the stored ones provided by any plugins registering with
   * the content-manager. The function calls however, need to be called at runtime in the
   * application, so instead we collate them and run them later with the complete list incl.
   * ones already registered & the context of the view.
   */
  richTextBlocksStore: RichTextBlocksStore = { ...defaultBlocksStore };
  bulkActions: BulkActionComponent[] = [...DEFAULT_BULK_ACTIONS];
  documentActions: DocumentActionComponent[] = [
    ...DEFAULT_ACTIONS,
    ...DEFAULT_TABLE_ROW_ACTIONS,
    ...DEFAULT_HEADER_ACTIONS,
  ];
  editViewSidePanels: PanelComponent[] = [ActionsPanel];
  headerActions: HeaderActionComponent[] = [];

  constructor() {}

  addRichTextBlocks(blocks: RichTextBlocksStore): void;
  addRichTextBlocks(blocks: DescriptionObjReducer<RichTextBlocksStore>): void;
  addRichTextBlocks(blocks: RichTextBlocksStore | DescriptionObjReducer<RichTextBlocksStore>) {
    if (typeof blocks === 'function') {
      const result = blocks(this.richTextBlocksStore);
      if (typeof result !== 'object' || result === null) {
        throw new Error(
          `Expected the \`blocks\` passed to \`addRichTextBlocks\` to be an object or a function, but received ${getPrintableType(result)}`
        );
      }
      this.richTextBlocksStore = result;
    } else if (typeof blocks === 'object') {
      this.richTextBlocksStore = { ...this.richTextBlocksStore, ...blocks };
    } else {
      throw new Error(
        `Expected the \`blocks\` passed to \`addRichTextBlocks\` to be an object or a function, but received ${getPrintableType(
          blocks
        )}`
      );
    }
  }

  addEditViewSidePanel(panels: DescriptionReducer<PanelComponent>): void;
  addEditViewSidePanel(panels: PanelComponent[]): void;
  addEditViewSidePanel(panels: DescriptionReducer<PanelComponent> | PanelComponent[]) {
    if (Array.isArray(panels)) {
      validateDescriptionItems(panels, 'addEditViewSidePanel', 'panels');
      this.editViewSidePanels = [...this.editViewSidePanels, ...panels];
    } else if (typeof panels === 'function') {
      const result = panels(this.editViewSidePanels);
      validateDescriptionItems(result, 'addEditViewSidePanel', 'panels');
      this.editViewSidePanels = result;
    } else {
      throw new Error(
        `Expected the \`panels\` passed to \`addEditViewSidePanel\` to be an array or a function, but received ${getPrintableType(
          panels
        )}`
      );
    }
  }

  addDocumentAction(actions: DescriptionReducer<DocumentActionComponent>): void;
  addDocumentAction(actions: DocumentActionComponent[]): void;
  addDocumentAction(
    actions: DescriptionReducer<DocumentActionComponent> | DocumentActionComponent[]
  ) {
    if (Array.isArray(actions)) {
      validateDescriptionItems(actions, 'addDocumentAction', 'actions');
      this.documentActions = [...this.documentActions, ...actions];
    } else if (typeof actions === 'function') {
      const result = actions(this.documentActions);
      validateDescriptionItems(result, 'addDocumentAction', 'actions');
      this.documentActions = result;
    } else {
      throw new Error(
        `Expected the \`actions\` passed to \`addDocumentAction\` to be an array or a function, but received ${getPrintableType(
          actions
        )}`
      );
    }
  }

  addDocumentHeaderAction(actions: DescriptionReducer<HeaderActionComponent>): void;
  addDocumentHeaderAction(actions: HeaderActionComponent[]): void;
  addDocumentHeaderAction(
    actions: DescriptionReducer<HeaderActionComponent> | HeaderActionComponent[]
  ) {
    if (Array.isArray(actions)) {
      validateDescriptionItems(actions, 'addDocumentHeaderAction', 'actions');
      this.headerActions = [...this.headerActions, ...actions];
    } else if (typeof actions === 'function') {
      const result = actions(this.headerActions);
      validateDescriptionItems(result, 'addDocumentHeaderAction', 'actions');
      this.headerActions = result;
    } else {
      throw new Error(
        `Expected the \`actions\` passed to \`addDocumentHeaderAction\` to be an array or a function, but received ${getPrintableType(
          actions
        )}`
      );
    }
  }

  addBulkAction(actions: DescriptionReducer<BulkActionComponent>): void;
  addBulkAction(actions: BulkActionComponent[]): void;
  addBulkAction(actions: DescriptionReducer<BulkActionComponent> | BulkActionComponent[]) {
    if (Array.isArray(actions)) {
      validateDescriptionItems(actions, 'addBulkAction', 'actions');
      this.bulkActions = [...this.bulkActions, ...actions];
    } else if (typeof actions === 'function') {
      const result = actions(this.bulkActions);
      validateDescriptionItems(result, 'addBulkAction', 'actions');
      this.bulkActions = result;
    } else {
      throw new Error(
        `Expected the \`actions\` passed to \`addBulkAction\` to be an array or a function, but received ${getPrintableType(
          actions
        )}`
      );
    }
  }

  get config() {
    return {
      id: PLUGIN_ID,
      name: 'Content Manager',
      injectionZones: INJECTION_ZONES,
      apis: {
        addBulkAction: this.addBulkAction.bind(this),
        addDocumentAction: this.addDocumentAction.bind(this),
        addDocumentHeaderAction: this.addDocumentHeaderAction.bind(this),
        addEditViewSidePanel: this.addEditViewSidePanel.bind(this),
        addRichTextBlocks: this.addRichTextBlocks.bind(this),
        getBulkActions: () => this.bulkActions,
        getDocumentActions: (position?: DocumentActionPosition) => {
          /**
           * When possible, pre-filter the actions by the components static position property.
           * This avoids rendering the actions in multiple places where they weren't displayed,
           * which wasn't visible but created issues with useEffect for instance.
           * The response should still be filtered by the position, as the static property is new
           * and not mandatory to avoid a breaking change.
           */
          if (position) {
            return this.documentActions.filter((action) => {
              return action.position == undefined || [action.position].flat().includes(position);
            });
          }

          return this.documentActions;
        },
        getEditViewSidePanels: () => this.editViewSidePanels,
        getHeaderActions: () => this.headerActions,
        getRichTextBlocks: () => ({ ...this.richTextBlocksStore }),
      },
    } satisfies PluginConfig;
  }
}

/* -------------------------------------------------------------------------------------------------
 * getPrintableType
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description Gets the human-friendly printable type name for the given value, for instance it will yield
 * `array` instead of `object`, as the native `typeof` operator would do.
 */
const getPrintableType = (value: unknown): string => {
  const nativeType = typeof value;

  if (nativeType === 'object') {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Object && value.constructor.name !== 'Object') {
      return value.constructor.name;
    }
  }

  return nativeType;
};

/* -------------------------------------------------------------------------------------------------
 * validateDescriptionItems
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description Descriptions must be functions (they're rendered as components so hooks can be used
 * inside them), not plain objects. Passing a plain object crashes deep inside
 * `DescriptionComponentRenderer` with an unhelpful `description is not a function` error, so we
 * validate eagerly here to fail fast with a clear message pointing at the offending API call.
 */
const validateDescriptionItems = (items: unknown[], apiName: string, argName: string): void => {
  items.forEach((item, index) => {
    if (typeof item !== 'function') {
      throw new Error(
        `Expected every item in the \`${argName}\` array passed to \`${apiName}\` to be a function that returns a description object, but received ${getPrintableType(
          item
        )} at index ${index}. Did you forget to wrap it in a function, e.g. \`() => ({ ...yourAction })\`?`
      );
    }
  });
};

export { ContentManagerPlugin };
export type {
  EditViewContext,
  ListViewContext,
  BulkActionComponent,
  BulkActionComponentProps,
  BulkActionDescription,
  DescriptionComponent,
  DescriptionReducer,
  PanelComponentProps,
  PanelComponent,
  PanelDescription,
  DocumentActionComponent,
  DocumentActionDescription,
  DocumentActionProps,
  HeaderActionComponent,
  HeaderActionDescription,
  HeaderActionProps,
};
