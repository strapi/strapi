/* eslint-disable check-file/filename-naming-convention */
import { createContext } from 'react';

import type { Component, ContentType } from '../../types';
import type { Internal, Struct } from '@strapi/types';

export interface DataManagerContextValue {
  isLoading: boolean;
  addAttribute: (opts: {
    attributeToSet: Record<string, any>;
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
  }) => void;
  editAttribute: (opts: {
    attributeToSet: Record<string, any>;
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
    name: string;
  }) => void;
  moveAttribute: (opts: {
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
    from: number;
    to: number;
  }) => void;
  addCustomFieldAttribute: (params: {
    attributeToSet: Record<string, any>;
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
  }) => void;
  editCustomFieldAttribute: (params: {
    attributeToSet: Record<string, any>;
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
    name: string;
  }) => void;
  addCreatedComponentToDynamicZone: (opts: {
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
    dynamicZoneTarget: string;
    componentsToAdd: Internal.UID.Component[];
  }) => void;
  createComponentSchema: (opts: {
    data: {
      icon: string;
      displayName: string;
    };
    componentCategory: string;
    uid: Internal.UID.Component;
  }) => void;
  createSchema: (opts: {
    data: {
      displayName: string;
      singularName: string;
      pluralName: string;
      kind: Struct.ContentTypeKind;
      draftAndPublish: boolean;
      pluginOptions: Record<string, any>;
    };
    uid: Internal.UID.Schema;
  }) => void;
  changeDynamicZoneComponents: (opts: {
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
    dynamicZoneTarget: string;
    newComponents: Internal.UID.Component[];
  }) => void;
  removeAttribute: (opts: {
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
    attributeToRemoveName: string;
  }) => void;
  deleteComponent(uid: Internal.UID.Component): void;
  deleteContentType(uid: Internal.UID.ContentType): void;
  removeComponentFromDynamicZone: (opts: {
    forTarget: Struct.ModelType;
    targetUid: Internal.UID.Schema;
    dzName: string;
    componentToRemoveIndex: number;
  }) => void;
  sortedContentTypesList: {
    visible: ContentType['visible'];
    name: ContentType['uid'];
    title: ContentType['info']['displayName'];
    plugin: ContentType['plugin'];
    uid: ContentType['uid'];
    to: string;
    kind: ContentType['kind'];
    restrictRelationsTo: ContentType['restrictRelationsTo'];
    status: ContentType['status'];
  }[];
  updateComponentSchema: (opts: {
    data: {
      icon: string;
      displayName: string;
    };
    componentUID: Internal.UID.Component;
  }) => void;
  updateComponentUid: (opts: {
    newComponentUID: Internal.UID.Component;
    componentUID: Internal.UID.Component;
  }) => void;
  updateSchema: (opts: {
    data: {
      displayName: string;
      kind: Struct.ContentTypeKind;
      draftAndPublish: boolean;
      pluginOptions: Record<string, any>;
    };
    uid: Internal.UID.ContentType;
  }) => void;
  initialComponents: Record<Internal.UID.Component, Component>;
  components: Record<Internal.UID.Component, Component>;
  componentsGroupedByCategory: Record<string, Component[]>;
  componentsThatHaveOtherComponentInTheirAttributes: any[]; // Define the actual type
  initialContentTypes: Record<Internal.UID.ContentType, ContentType>;
  contentTypes: Record<Internal.UID.ContentType, ContentType>;
  isInDevelopmentMode?: boolean;
  nestedComponents: any[]; // Define the actual type
  reservedNames: {
    models: string[];
    attributes: string[];
  };
  allComponentsCategories: any[];
  saveSchema(): Promise<void>;
  isModified: boolean;
  isSaving: boolean;
  applyChange: (opts: {
    action: 'add' | 'update' | 'delete';
    schema: ContentType | Component;
  }) => void;
  history: {
    undo(): void;
    redo(): void;
    discardAllChanges(): void;
    canUndo: boolean;
    canRedo: boolean;
    canDiscardAll: boolean;
  };
}

// @ts-expect-error need to pass initial value to params
export const DataManagerContext = createContext<DataManagerContextValue>();
