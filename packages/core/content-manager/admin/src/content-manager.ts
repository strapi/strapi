/* eslint-disable check-file/filename-naming-convention */
import { INJECTION_ZONES } from './components/InjectionZone';
import { PLUGIN_ID } from './constants/plugin';
import { HistoryAction } from './history/components/HistoryAction';
import {
  DEFAULT_ACTIONS,
  type DocumentActionDescription,
} from './pages/EditView/components/DocumentActions';
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
  bulkActions: BulkActionComponent[] = [...DEFAULT_BULK_ACTIONS];
  documentActions: DocumentActionComponent[] = [
    ...DEFAULT_ACTIONS,
    ...DEFAULT_TABLE_ROW_ACTIONS,
    ...DEFAULT_HEADER_ACTIONS,
  ];
  editViewSidePanels: PanelComponent[] = [ActionsPanel];
  headerActions: HeaderActionComponent[] = [];

  constructor() {}

  addEditViewSidePanel(panels: DescriptionReducer<PanelComponent>): void;
  addEditViewSidePanel(panels: PanelComponent[]): void;
  addEditViewSidePanel(panels: DescriptionReducer<PanelComponent> | PanelComponent[]) {
    if (Array.isArray(panels)) {
      this.editViewSidePanels = [...this.editViewSidePanels, ...panels];
    } else if (typeof panels === 'function') {
      this.editViewSidePanels = panels(this.editViewSidePanels);
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
      this.documentActions = [...this.documentActions, ...actions];
    } else if (typeof actions === 'function') {
      this.documentActions = actions(this.documentActions);
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
      this.headerActions = [...this.headerActions, ...actions];
    } else if (typeof actions === 'function') {
      this.headerActions = actions(this.headerActions);
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
      this.bulkActions = [...this.bulkActions, ...actions];
    } else if (typeof actions === 'function') {
      this.bulkActions = actions(this.bulkActions);
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
        getBulkActions: () => this.bulkActions,
        getDocumentActions: () => this.documentActions,
        getEditViewSidePanels: () => this.editViewSidePanels,
        getHeaderActions: () => this.headerActions,
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
