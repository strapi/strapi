/* eslint-disable check-file/filename-naming-convention */
import { createContext } from 'react';

import type { SchemaType, Component } from '../types';
import type { Internal } from '@strapi/types';

// TODO V5 Convert this any types to real types
export interface CustomFieldAttributeParams {
  attributeToSet: Record<string, any>;
  forTarget: SchemaType;
  targetUid: Internal.UID.Schema;
  initialAttribute: Record<string, any>;
}
export interface DataManagerContextValue {
  addAttribute: (
    attributeToSet: Record<string, any>,
    forTarget: SchemaType,
    targetUid: Internal.UID.Schema,
    isEditing?: boolean,
    initialAttribute?: Record<string, any>,
    shouldAddComponentToData?: boolean
  ) => void;
  addCustomFieldAttribute: (params: CustomFieldAttributeParams) => void;
  editCustomFieldAttribute: (params: CustomFieldAttributeParams) => void;
  addCreatedComponentToDynamicZone: (dynamicZoneTarget: string, componentsToAdd: string[]) => void;
  createSchema: (
    data: Record<string, any>,
    schemaType: SchemaType,
    uid: Internal.UID.Schema,
    componentCategory?: string,
    shouldAddComponentToData?: boolean
  ) => void;
  changeDynamicZoneComponents: (dynamicZoneTarget: string, newComponents: string[]) => void;
  removeAttribute: (
    mainDataKey: string,
    attributeToRemoveName: string,
    componentUid?: string
  ) => void;
  deleteCategory: (categoryUid: string) => void;
  deleteData: () => void;
  editCategory: (categoryUid: string, body: any) => void;
  removeComponentFromDynamicZone: (dzName: string, componentToRemoveIndex: number) => void;
  setModifiedData: () => void;
  sortedContentTypesList: any[]; // Define the actual type
  submitData: (additionalContentTypeData?: Record<string, any>) => Promise<void>;
  updateSchema: (
    data: Record<string, any>,
    schemaType: SchemaType,
    componentUID: Internal.UID.Component
  ) => void;
  components: Record<Internal.UID.Component, Component>;
  componentsGroupedByCategory: Record<string, Component[]>;
  componentsThatHaveOtherComponentInTheirAttributes: any[]; // Define the actual type
  contentTypes: Record<string, any>;
  initialData: Record<string, any>;
  isInContentTypeView: boolean;
  isInDevelopmentMode?: boolean;
  modifiedData: Record<string, any>;
  nestedComponents: any[]; // Define the actual type
  reservedNames: {
    models: string[];
    attributes: string[];
  };
  allComponentsCategories: any[];
}

// @ts-expect-error need to pass initial value to params
export const DataManagerContext = createContext<DataManagerContextValue>();
