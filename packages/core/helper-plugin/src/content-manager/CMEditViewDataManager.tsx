import * as React from 'react';

import { MessageDescriptor } from 'react-intl';
import { InputType } from 'types';

import type { Attribute, Schema } from '@strapi/strapi';

/**
 * TODO: All these types could be accurately inferred from
 * their usage in the content-manager when we move it back.
 */
interface CMEditViewDataManagerContext {
  addComponentToDynamicZone?: (
    keys: string[],
    componentLayoutData: Record<string, unknown>,
    allComponents: Record<string, unknown>,
    shouldCheckErrors?: boolean,
    position?: number
  ) => void;
  addNonRepeatableComponentToField?: (
    keys: string[],
    componentLayoutData: Record<string, unknown>,
    allComponents: Record<string, unknown>
  ) => void;
  addRepeatableComponentToField?: (
    keys: string[],
    componentLayoutData: Record<string, unknown>,
    allComponents: Record<string, unknown>,
    shouldCheckErrors?: boolean,
    position?: number
  ) => void;
  allLayoutData: {
    components: Record<string, Schema.Component>;
    contentType?: Schema.CollectionType | Schema.SingleType;
  };
  createActionAllowedFields: string[];
  formErrors: Record<string, MessageDescriptor>;
  hasDraftAndPublish: boolean;
  // TODO: define the tree, can it be inferred?
  initialData: Record<string, unknown>;
  isCreatingEntry: boolean;
  isSingleType: boolean;
  layout?: Schema.CollectionType | Schema.SingleType;
  // TODO: define the tree, can it be inferred?
  modifiedData: Record<string, unknown>;
  moveComponentDown?: (dynamicZoneName: string, currentIndex: number) => void;
  moveComponentField?: (payload: { name: string; newIndex: number; currentIndex: number }) => void;
  moveComponentUp?: (dynamicZoneName: string, currentIndex: number) => void;
  onChange?: <TAttribute extends Attribute.Any>(
    payload: {
      target: { name: string; type?: InputType; value: Attribute.GetValue<TAttribute> };
    },
    shouldSetInitialValue?: boolean
  ) => void;
  onPublish?: () => Promise<unknown>;
  onUnpublish?: () => Promise<unknown>;
  readActionAllowedFields: string[];
  relationConnect?: (payload: {
    name: string;
    // This is a `Relation`
    value: object;
    toOneRelation: boolean;
  }) => void;
  relationDisconnect?: (payload: { name: string; id: string }) => void;
  relationLoad?: (payload: {
    target: {
      initialDataPath: string[];
      modifiedDataPath: string[];
      // This is a `Relation`
      value: object;
      modifiedDataOnly: boolean;
    };
  }) => void;
  relationReorder?: (payload: { name: string; oldIndex: number; newIndex: number }) => void;
  removeComponentFromDynamicZone?: (dynamicZoneName: string, index: number) => void;
  removeComponentFromField?: (key: string, uid: string) => void;
  removeRepeatableField?: (key: string, uid: string) => void;
  slug?: string;
  // TODO: this can be refined to a union.
  status?: string;
  upateActionAllowedFields: string[];
}

const ContentManagerEditViewDataManagerContext = React.createContext<CMEditViewDataManagerContext>({
  allLayoutData: {
    components: {},
  },
  createActionAllowedFields: [],
  formErrors: {},
  hasDraftAndPublish: false,
  initialData: {},
  isCreatingEntry: false,
  isSingleType: false,
  modifiedData: {},
  readActionAllowedFields: [],
  slug: undefined,
  upateActionAllowedFields: [],
});

const useCMEditViewDataManager = () => React.useContext(ContentManagerEditViewDataManagerContext);

export { useCMEditViewDataManager, ContentManagerEditViewDataManagerContext };
