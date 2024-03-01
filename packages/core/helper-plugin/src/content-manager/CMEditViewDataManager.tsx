import * as React from 'react';

import { TranslationMessage } from '../types';

import type { Schema, Data, Struct } from '@strapi/types';

interface Entity {
  id: Data.ID;
  createdAt: string | null;
  createdBy: User | null;
  updatedAt: string | null;
  updatedBy: User | null;
}

type NonNullableObject<T> = {
  [key in keyof T]: NonNullable<T[key]>;
};

/**
 * TODO: should this be `SanitizedUser` from the API?
 */
interface User extends NonNullableObject<Entity> {
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  isActive: boolean;
  blocked: boolean;
  roles: [];
}

interface ContentType extends Partial<Entity> {
  publishedAt?: string | null;
  publishedBy?: User | null;
  [key: string]: Schema.Attribute.Value<Schema.Attribute.AnyAttribute> | null;
}

/**
 * TODO: All these types could be accurately inferred from
 * their usage in the content-manager when we move it back.
 */
interface CMEditViewDataManagerContextValue {
  addComponentToDynamicZone?: (
    keys: string,
    componentLayoutData: Record<string, unknown>,
    allComponents: Record<string, unknown>,
    shouldCheckErrors?: boolean,
    position?: number
  ) => void;
  addNonRepeatableComponentToField?: (
    keys: string,
    componentLayoutData: Struct.ComponentSchema,
    allComponents: Record<string, Struct.ComponentSchema>
  ) => void;
  addRepeatableComponentToField?: (
    keys: string,
    componentLayoutData: Record<string, unknown>,
    allComponents: Record<string, unknown>,
    shouldCheckErrors?: boolean,
    position?: number
  ) => void;
  allLayoutData: {
    components: Record<string, Struct.ComponentSchema>;
    contentType?: Struct.ContentTypeSchema;
  };
  createActionAllowedFields: string[];
  formErrors: Record<string, TranslationMessage>;
  initialData: ContentType;
  isCreatingEntry: boolean;
  isSingleType: boolean;
  layout?: Struct.CollectionTypeSchema | Struct.SingleTypeSchema;
  modifiedData: ContentType;
  moveComponentDown?: (dynamicZoneName: string, currentIndex: number) => void;
  moveComponentField?: (payload: { name: string; newIndex: number; currentIndex: number }) => void;
  moveComponentUp?: (dynamicZoneName: string, currentIndex: number) => void;
  onChange?: <TAttribute extends Schema.Attribute.AnyAttribute>(
    payload: {
      target: { name: string; type: string; value: Schema.Attribute.Value<TAttribute> };
    },
    shouldSetInitialValue?: boolean
  ) => void;
  onPublish?: () => Promise<unknown>;
  onPublishPromptDismissal?: (e: React.SyntheticEvent) => Promise<void>;
  onUnpublish?: () => Promise<unknown>;
  publishConfirmation?: {
    show: boolean;
    draftCount: number;
  };
  readActionAllowedFields: string[];
  relationConnect?: (payload: {
    name: string;
    value: { id: Entity['id'] };
    toOneRelation?: boolean;
  }) => void;
  relationDisconnect?: (payload: { name: string; id: Entity['id'] }) => void;
  relationLoad?: (payload: {
    target: {
      initialDataPath: string[];
      modifiedDataPath: string[];
      value: { id: Entity['id'] }[];
      modifiedDataOnly?: boolean;
    };
  }) => void;
  relationReorder?: (payload: { name: string; oldIndex: number; newIndex: number }) => void;
  removeComponentFromDynamicZone?: (dynamicZoneName: string, index: number) => void;
  removeComponentFromField?: (key: string, uid: string) => void;
  removeRepeatableField?: (key: string, uid?: string) => void;
  shouldNotRunValidations?: boolean;
  slug?: string;
  // TODO: this can be refined to a union.
  status?: string;
  updateActionAllowedFields: string[];
}

const ContentManagerEditViewDataManagerContext =
  React.createContext<CMEditViewDataManagerContextValue>({
    allLayoutData: {
      components: {},
    },
    createActionAllowedFields: [],
    formErrors: {},
    initialData: {},
    isCreatingEntry: false,
    isSingleType: false,
    modifiedData: {},
    readActionAllowedFields: [],
    slug: undefined,
    updateActionAllowedFields: [],
  });

const useCMEditViewDataManager = () => React.useContext(ContentManagerEditViewDataManagerContext);

export { useCMEditViewDataManager, ContentManagerEditViewDataManagerContext };
export type { ContentType, CMEditViewDataManagerContextValue };
