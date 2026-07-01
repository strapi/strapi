import { actions } from '../../DataManager/reducer';

import type { CTBOperation } from './types/ctbOperations';
import type { DataManagerContextValue } from '../../DataManager/DataManagerContext';
import type { Internal } from '@strapi/types';

export type ApplyCTBOperationsDataManager = Pick<
  DataManagerContextValue,
  | 'createSchema'
  | 'createComponentSchema'
  | 'addAttribute'
  | 'editAttribute'
  | 'removeAttribute'
  | 'updateSchema'
  | 'updateComponentSchema'
  | 'deleteContentType'
  | 'deleteComponent'
  | 'changeDynamicZoneComponents'
  | 'removeComponentFromDynamicZone'
  | 'moveAttribute'
  | 'addCreatedComponentToDynamicZone'
  | 'addCustomFieldAttribute'
  | 'editCustomFieldAttribute'
  | 'updateComponentUid'
>;

type DeleteBypassAction =
  | ReturnType<typeof actions.deleteContentType>
  | ReturnType<typeof actions.deleteComponent>;

export type ApplyCTBOperationsOptions = {
  /**
   * When provided, `deleteContentType` / `deleteComponent` bypass `window.confirm`
   * by dispatching reducer actions directly (see DataManagerProvider wiring).
   */
  dispatch?: (action: DeleteBypassAction) => void;
};

/**
 * Applies an ordered list of CTB AI v2 operations by calling existing DataManager
 * methods 1:1. Operations run sequentially — order matters for renames and swaps.
 */
export function applyCTBOperations(
  operations: CTBOperation[],
  dm: ApplyCTBOperationsDataManager,
  options?: ApplyCTBOperationsOptions
): void {
  for (const operation of operations) {
    switch (operation.op) {
      case 'createSchema':
        dm.createSchema({ uid: operation.uid, data: operation.data });
        break;
      case 'createComponentSchema':
        dm.createComponentSchema({
          uid: operation.uid,
          componentCategory: operation.componentCategory,
          data: operation.data,
        });
        break;
      case 'addAttribute':
        dm.addAttribute({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          attributeToSet: operation.attributeToSet,
        });
        break;
      case 'editAttribute':
        dm.editAttribute({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          name: operation.name,
          attributeToSet: operation.attributeToSet,
        });
        break;
      case 'removeAttribute':
        dm.removeAttribute({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          attributeToRemoveName: operation.attributeToRemoveName,
        });
        break;
      case 'updateSchema':
        dm.updateSchema({ uid: operation.uid, data: operation.data });
        break;
      case 'updateComponentSchema':
        dm.updateComponentSchema({
          componentUID: operation.uid as Internal.UID.Component,
          data: operation.data,
        });
        break;
      case 'deleteContentType':
        if (options?.dispatch) {
          options.dispatch(actions.deleteContentType(operation.uid as Internal.UID.ContentType));
        } else {
          dm.deleteContentType(operation.uid as Internal.UID.ContentType);
        }
        break;
      case 'deleteComponent':
        if (options?.dispatch) {
          options.dispatch(actions.deleteComponent(operation.uid as Internal.UID.Component));
        } else {
          dm.deleteComponent(operation.uid as Internal.UID.Component);
        }
        break;
      case 'changeDynamicZoneComponents':
        dm.changeDynamicZoneComponents({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          dynamicZoneTarget: operation.dynamicZoneTarget,
          newComponents: operation.newComponents as Internal.UID.Component[],
        });
        break;
      case 'removeComponentFromDynamicZone':
        dm.removeComponentFromDynamicZone({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          dzName: operation.dzName,
          componentToRemoveIndex: operation.componentToRemoveIndex,
        });
        break;
      case 'moveAttribute':
        dm.moveAttribute({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          from: operation.from,
          to: operation.to,
        });
        break;
      case 'addCreatedComponentToDynamicZone':
        dm.addCreatedComponentToDynamicZone({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          dynamicZoneTarget: operation.dynamicZoneTarget,
          componentsToAdd: operation.componentsToAdd as Internal.UID.Component[],
        });
        break;
      case 'addCustomFieldAttribute':
        dm.addCustomFieldAttribute({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          attributeToSet: operation.attributeToSet,
        });
        break;
      case 'editCustomFieldAttribute':
        dm.editCustomFieldAttribute({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          name: operation.name,
          attributeToSet: operation.attributeToSet,
        });
        break;
      case 'updateComponentUid':
        dm.updateComponentUid({
          componentUID: operation.uid as Internal.UID.Component,
          newComponentUID: operation.newComponentUID as Internal.UID.Component,
        });
        break;
      default: {
        const _exhaustive: never = operation;
        throw new Error(`Unknown CTB operation: ${(_exhaustive as CTBOperation).op}`);
      }
    }
  }
}
