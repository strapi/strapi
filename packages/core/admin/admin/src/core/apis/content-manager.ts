/* eslint-disable check-file/filename-naming-convention */
/**
 * This file can be removed when the content-manager is moved back to it's own plugin,
 * we would just add the APIs that plugin and continue to alias their methods on the
 * main StrapiApp class.
 */

import {
  DEFAULT_BULK_ACTIONS,
  type BulkActionDescription,
} from '../../content-manager/pages/ListView/components/BulkActions/Actions';

import type { PluginConfig } from './Plugin';
import type { DescriptionComponent } from '../../components/DescriptionComponentRenderer';
import type { Entity } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * Configuration Types
 * -----------------------------------------------------------------------------------------------*/

type DescriptionReducer<Config extends object> = (prev: Config[]) => Config[];

interface Context {
  /**
   * Will be either 'single-types' | 'collection-types'
   */
  collectionType: string;
  /**
   * this will be undefined if someone is creating an entry.
   */
  entity?: Document;
  /**
   * this will be undefined if someone is creating an entry.
   */
  id?: Entity.ID;
  /**
   * The current content-type's model.
   */
  model: string;
}

interface BulkActionComponentProps extends Omit<Context, 'id' | 'entity'> {
  ids: Entity.ID[];
}

interface BulkActionComponent
  extends DescriptionComponent<BulkActionComponentProps, BulkActionDescription> {
  actionType?: 'delete' | 'publish' | 'unpublish';
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

  constructor() {}

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
      id: 'content-manager',
      name: 'Content Manager',
      apis: {
        addBulkAction: this.addBulkAction.bind(this),
        getBulkActions: () => this.bulkActions,
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
export type { Context, DescriptionComponent, DescriptionReducer, BulkActionComponent };
