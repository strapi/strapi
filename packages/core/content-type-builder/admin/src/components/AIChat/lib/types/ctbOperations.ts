/**
 * CTB AI v2 operation wire contract.
 *
 * Keep in sync with strapi-ai `@ai/types` — any change here should be reflected there.
 * @see CTB_AI_V2/HANDOFF.md
 */

export type ForTarget = 'contentType' | 'component';

export type CTBOperation =
  | {
      op: 'createSchema';
      uid: string;
      data: {
        displayName: string;
        singularName: string;
        pluralName: string;
        kind: 'collectionType' | 'singleType';
        draftAndPublish: boolean;
        pluginOptions: Record<string, unknown>;
      };
    }
  | {
      op: 'createComponentSchema';
      uid: string;
      componentCategory: string;
      data: { icon: string; displayName: string };
    }
  | {
      op: 'addAttribute';
      forTarget: ForTarget;
      targetUid: string;
      attributeToSet: Record<string, unknown>;
    }
  | {
      op: 'editAttribute';
      forTarget: ForTarget;
      targetUid: string;
      name: string;
      attributeToSet: Record<string, unknown>;
    }
  | {
      op: 'removeAttribute';
      forTarget: ForTarget;
      targetUid: string;
      attributeToRemoveName: string;
    }
  | {
      op: 'updateSchema';
      uid: string;
      data: {
        displayName: string;
        kind: 'collectionType' | 'singleType';
        draftAndPublish: boolean;
        pluginOptions: Record<string, unknown>;
      };
    }
  | {
      op: 'updateComponentSchema';
      uid: string;
      data: { icon: string; displayName: string; category?: string };
    }
  | { op: 'deleteContentType'; uid: string }
  | { op: 'deleteComponent'; uid: string }
  | {
      op: 'changeDynamicZoneComponents';
      forTarget: ForTarget;
      targetUid: string;
      dynamicZoneTarget: string;
      newComponents: string[];
    }
  | {
      op: 'removeComponentFromDynamicZone';
      forTarget: ForTarget;
      targetUid: string;
      dzName: string;
      componentToRemoveIndex: number;
    }
  | {
      op: 'moveAttribute';
      forTarget: ForTarget;
      targetUid: string;
      from: number;
      to: number;
    }
  | {
      op: 'addCreatedComponentToDynamicZone';
      forTarget: ForTarget;
      targetUid: string;
      dynamicZoneTarget: string;
      componentsToAdd: string[];
    }
  | {
      op: 'addCustomFieldAttribute';
      forTarget: ForTarget;
      targetUid: string;
      attributeToSet: Record<string, unknown>;
    }
  | {
      op: 'editCustomFieldAttribute';
      forTarget: ForTarget;
      targetUid: string;
      name: string;
      attributeToSet: Record<string, unknown>;
    }
  | { op: 'updateComponentUid'; uid: string; newComponentUID: string };

export type CTBOperationsResult = {
  operations: CTBOperation[];
};
