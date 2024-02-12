/* eslint-disable check-file/filename-naming-convention */
/**
 * This file can be removed when the content-manager is moved back to it's own plugin,
 * we would just add the APIs that plugin and continue to alias their methods on the
 * main StrapiApp class.
 */

import { ReviewWorkflowsPanel } from '../../../../ee/admin/src/content-manager/pages/EditView/components/ReviewWorkflowsPanel';
import {
  DEFAULT_ACTIONS,
  type DocumentActionDescription,
} from '../../content-manager/pages/EditView/components/DocumentActions';
import { DEFAULT_HEADER_ACTIONS } from '../../content-manager/pages/EditView/components/Header';
import {
  ActionsPanel,
  type PanelDescription,
} from '../../content-manager/pages/EditView/components/Panels';

import type { PluginConfig } from './Plugin';
import type { DescriptionComponent } from '../../components/DescriptionComponentRenderer';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute } from '@strapi/types';

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
  document?: {
    [key: string]: Attribute.GetValue<Attribute.Any>;
  };
  /**
   * this will be undefined if someone is creating an entry.
   */
  id?: string;
  /**
   * this will be undefined if someone is creating an entry.
   */
  meta?: Contracts.CollectionTypes.DocumentMetadata;
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
  type?: 'actions' | 'review-workflows' | 'releases';
}

interface DocumentActionProps extends EditViewContext {}

interface DocumentActionComponent
  extends DescriptionComponent<DocumentActionProps, DocumentActionDescription> {
  type?: 'configure-the-view' | 'delete' | 'edit-the-model' | 'publish' | 'unpublish' | 'update';
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
  documentActions: DocumentActionComponent[] = [...DEFAULT_HEADER_ACTIONS, ...DEFAULT_ACTIONS];
  editViewSidePanels: PanelComponent[] = [ActionsPanel, ReviewWorkflowsPanel];

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

  get config() {
    return {
      id: 'content-manager',
      name: 'Content Manager',
      apis: {
        addDocumentAction: this.addDocumentAction,
        addEditViewSidePanel: this.addEditViewSidePanel,
        getDocumentActions: () => this.documentActions,
        getEditViewSidePanels: () => this.editViewSidePanels,
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
  PanelComponent,
  PanelDescription,
  DescriptionComponent,
  DescriptionReducer,
  EditViewContext,
  PanelComponentProps,
  DocumentActionComponent,
  DocumentActionDescription,
  DocumentActionProps,
};
