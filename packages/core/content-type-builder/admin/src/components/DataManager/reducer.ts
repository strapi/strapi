import { PayloadAction } from '@reduxjs/toolkit';
import merge from 'lodash/merge';
import omit from 'lodash/omit';

import { getRelationType } from '../../utils/getRelationType';
import { makeUnique } from '../../utils/makeUnique';

import { createUndoRedoSlice } from './undoRedo';
import {
  createEmptyContentStructure,
  MAX_FOLDER_DEPTH,
  sectionKeyForKind,
} from './utils/contentStructure';

import type {
  Components,
  ContentTypes,
  ContentType,
  Component,
  Status,
  AnyAttribute,
} from '../../types';
import type {
  ContentStructure,
  ContentStructureGroup,
  GroupStatus,
  SectionKey,
} from './utils/contentStructure';
import type { Internal, Schema, Struct, UID } from '@strapi/types';

export interface DataManagerStateType {
  components: Components;
  initialComponents: Components;
  contentTypes: ContentTypes;
  initialContentTypes: ContentTypes;
  contentStructure: ContentStructure;
  initialContentStructure: ContentStructure;
  reservedNames: {
    models: string[];
    attributes: string[];
  };
  isLoading: boolean;
  [key: string]: unknown;
}

const initialState: DataManagerStateType = {
  components: {},
  contentTypes: {},
  initialComponents: {},
  initialContentTypes: {},
  contentStructure: createEmptyContentStructure(),
  initialContentStructure: createEmptyContentStructure(),
  reservedNames: {
    models: [],
    attributes: [],
  },
  isLoading: true,
};

const ONE_SIDE_RELATIONS = ['oneWay', 'manyWay'];

type AttributeMutation = AnyAttribute & {
  createComponent?: unknown;
};

type PluginOptions = Record<string, unknown>;

const getOppositeRelation = (originalRelation?: Schema.Attribute.RelationKind.Any) => {
  if (originalRelation === 'manyToOne') {
    return 'oneToMany';
  }

  if (originalRelation === 'oneToMany') {
    return 'manyToOne';
  }

  return originalRelation;
};

const findAttributeIndex = (type: ContentType | Component, attributeToFind?: string) => {
  return type.attributes.findIndex(({ name }: { name: string }) => name === attributeToFind);
};

type InitPayload = {
  components: Record<string, Component>;
  contentTypes: Record<string, ContentType>;
  reservedNames: DataManagerStateType['reservedNames'];
  contentStructure?: ContentStructure;
};

type CreateFolderPayload = {
  parentId: string | null;
  section: SectionKey;
  name: string;
  id: string;
};

type RenameFolderPayload = {
  section: SectionKey;
  name: string;
  id: string;
};

type MoveFolderPayload = {
  newParentId: string | null;
  section: SectionKey;
  index?: number;
  id: string;
};

type DeleteFolderPayload = {
  section: SectionKey;
  id: string;
};

type AssignContentTypeToFolderPayload = {
  targetGroupId: string | null;
  uid: UID.ContentType;
  section: SectionKey;
  index?: number;
};

type ReorderFolderChildrenPayload = {
  section: SectionKey;
  groupId: string;
  from: number;
  to: number;
};

type AddAttributePayload = {
  attributeToSet: AttributeMutation;
  forTarget: Struct.ModelType;
  targetUid: string;
};

type AddCreateComponentToDynamicZonePayload = {
  forTarget: Struct.ModelType;
  targetUid: string;
  dynamicZoneTarget: string;
  componentsToAdd: Internal.UID.Component[];
};

type AddCustomFieldAttributePayload = {
  attributeToSet: AttributeMutation;
  forTarget: Struct.ModelType;
  targetUid: string;
};

type ChangeDynamicZoneComponentsPayload = {
  dynamicZoneTarget: string;
  newComponents: Internal.UID.Component[];
  forTarget: Struct.ModelType;
  targetUid: string;
};

type CreateComponentSchemaPayload = {
  uid: string;
  data: {
    icon?: string;
    displayName: string;
  };
  componentCategory: string;
};

type CreateSchemaPayload = {
  uid: string;
  data: {
    displayName: string;
    singularName: string;
    pluralName: string;
    kind: Struct.ContentTypeKind;
    draftAndPublish: boolean;
    pluginOptions: PluginOptions;
  };
};

type EditAttributePayload = {
  attributeToSet: AttributeMutation;
  forTarget: Struct.ModelType;
  targetUid: string;
  name: string;
};

type EditCustomFieldAttributePayload = {
  attributeToSet: AttributeMutation;
  forTarget: Struct.ModelType;
  targetUid: string;
  name: string;
};

type RemoveComponentFromDynamicZonePayload = {
  forTarget: Struct.ModelType;
  targetUid: string;
  dzName: string;
  componentToRemoveIndex: number;
};

type RemoveFieldPayload = {
  forTarget: Struct.ModelType;
  targetUid: string;
  attributeToRemoveName: string;
};

type UpdateComponentSchemaPayload = {
  data: {
    icon?: string;
    displayName: string;
  };
  uid: Internal.UID.Component;
};

type UpdateComponentUIDPayload = {
  uid: Internal.UID.Component;
  newComponentUID: Internal.UID.Component;
};

type UpdateSchemaPayload = {
  data: {
    displayName: string;
    kind: Struct.ContentTypeKind;
    draftAndPublish: boolean;
    pluginOptions: PluginOptions;
  };
  uid: string;
};

type MoveAttributePayload = {
  forTarget: Struct.ModelType;
  targetUid: string;
  from: number;
  to: number;
};

const getType = (
  state: DataManagerStateType,
  {
    forTarget,
    targetUid,
  }: {
    forTarget: Struct.ModelType;
    targetUid: string;
  }
) => {
  return forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];
};

// TODO: use initial state when chnaging back to the initial state without knowing
const setStatus = (type: ContentType | Component, status: Status) => {
  switch (type.status) {
    case 'NEW':
    case 'REMOVED': {
      break;
    }
    default: {
      type.status = status;
    }
  }
};

const getNewStatus = (oldStatus: Status | undefined, newStatus: Status) => {
  if (oldStatus === 'NEW' || oldStatus === 'REMOVED') {
    return oldStatus;
  }

  return newStatus;
};

const getNewGroupStatus = (oldStatus: GroupStatus, newStatus: GroupStatus): GroupStatus => {
  if (oldStatus === 'NEW') {
    return oldStatus;
  }

  return newStatus;
};

const setAttributeStatus = (attribute: { status?: Status }, status: Status) => {
  attribute.status = getNewStatus(attribute.status, status);
};

const createAttribute = (properties: Record<string, unknown>): AnyAttribute => {
  return {
    ...properties,
    status: 'NEW',
  } as AnyAttribute;
};

const setAttributeAt = (type: ContentType | Component, index: number, attribute: AnyAttribute) => {
  const previousAttribute = type.attributes[index];

  const newStatus = getNewStatus(previousAttribute.status, 'CHANGED');

  type.attributes[index] = {
    ...attribute,
    status: newStatus,
  };

  setStatus(type, 'CHANGED');
};

const pushAttribute = (type: ContentType | Component, attribute: AnyAttribute) => {
  type.attributes.push(attribute);
  setStatus(type, 'CHANGED');
};

const removeAttributeAt = (type: ContentType | Component, index: number) => {
  const attr = type.attributes[index];

  setStatus(type, 'CHANGED');

  if (attr.status === 'NEW') {
    type.attributes.splice(index, 1);
  } else {
    setAttributeStatus(attr, 'REMOVED');
  }
};

const replaceAttributeAt = (
  type: ContentType | Component,
  index: number,
  attribute: AnyAttribute
) => {
  type.attributes[index] = attribute;
  setStatus(type, 'CHANGED');
};

const removeAttributeByName = (type: ContentType | Component, name: string) => {
  const idx = type.attributes.findIndex((attr) => attr.name === name);

  const attr = type.attributes[idx];

  setStatus(type, 'CHANGED');

  if (attr.status === 'NEW') {
    type.attributes.splice(idx, 1);
  } else {
    setAttributeStatus(attr, 'REMOVED');
  }
};

const updateType = (type: ContentType | Component, data: Record<string, unknown>) => {
  merge(type, data);
  setStatus(type, 'CHANGED');
};

const findGroup = (groups: ContentStructureGroup[], id: string) => {
  return groups.find((group) => group.id === id);
};

const setGroupStatus = (group: ContentStructureGroup, status: GroupStatus): void => {
  group.status = getNewGroupStatus(group.status, status);
};

/**
 * Remove a content type reference from every group of a section, mark the group as changed if a reference was removed.
 * @returns true if a reference was removed, false otherwise.
 */
const removeContentTypeChild = (groups: ContentStructureGroup[], uid: string): boolean => {
  let removed = false;

  for (const group of groups) {
    const groupIndex = group.children.findIndex((child) => {
      return child.type === 'contentType' && child.uid === uid;
    });

    if (groupIndex !== -1) {
      group.children.splice(groupIndex, 1);
      setGroupStatus(group, 'CHANGED');
      removed = true;
    }
  }

  return removed;
};

/**
 * Determines whether `potentialDescendantId` is nested somewhere inside `ancestorId`'s subtree
 */
const isDescendantGroup = (
  groups: ContentStructureGroup[],
  ancestorId: string,
  potentialDescendantId: string
): boolean => {
  let current = findGroup(groups, potentialDescendantId);

  while (current && current.parent !== null) {
    if (current.parent === ancestorId) {
      return true;
    }

    current = findGroup(groups, current.parent);
  }

  return false;
};

const getGroupDepth = (groups: ContentStructureGroup[], id: string): number => {
  let depth = 1;
  let current = findGroup(groups, id);

  while (current && current.parent !== null) {
    current = findGroup(groups, current.parent);
    depth += 1;
  }

  return depth;
};

/**
 * Number of folder levels below a group e.g. a group with no sub-folders has height 0.
 */
const getSubtreeHeight = (groups: ContentStructureGroup[], id: string): number => {
  const group = findGroup(groups, id);

  if (!group) {
    return 0;
  }

  let height = 0;

  for (const child of group.children) {
    if (child.type !== 'group') continue;
    height = Math.max(height, 1 + getSubtreeHeight(groups, child.id));
  }

  return height;
};

const slice = createUndoRedoSlice(
  {
    name: 'data-manager',
    initialState,
    reducers: {
      init: (state, action: PayloadAction<InitPayload>) => {
        const { components, contentTypes, reservedNames, contentStructure } = action.payload;

        state.components = components;
        state.initialComponents = components;
        state.initialContentTypes = contentTypes;
        state.contentTypes = contentTypes;
        state.reservedNames = reservedNames;

        const structure = contentStructure ?? createEmptyContentStructure();
        state.initialContentStructure = structure;
        state.contentStructure = structure;

        state.isLoading = false;
      },
      createComponentSchema: (state, action: PayloadAction<CreateComponentSchemaPayload>) => {
        const { uid, data, componentCategory } = action.payload;

        const newSchema: Component = {
          uid: uid as Internal.UID.Component,
          status: 'NEW',
          category: componentCategory,
          modelName: data.displayName,
          globalId: data.displayName,
          info: {
            icon: data.icon,
            displayName: data.displayName,
          },
          attributes: [],
          modelType: 'component',
        };

        state.components[uid as string] = newSchema;
      },
      createSchema: (state, action: PayloadAction<CreateSchemaPayload>) => {
        const { uid, data } = action.payload;

        const { displayName, singularName, pluralName, kind, draftAndPublish, pluginOptions } =
          data;

        const newSchema: ContentType = {
          uid: uid as Internal.UID.ContentType,
          status: 'NEW',
          visible: true,
          modelType: 'contentType',
          restrictRelationsTo: null,
          attributes: [],
          kind,
          modelName: displayName,
          globalId: displayName,
          options: {
            draftAndPublish,
          },
          info: {
            displayName,
            singularName,
            pluralName,
          },
          pluginOptions,
        };

        state.contentTypes[uid] = newSchema;
      },
      addAttribute: (state, action: PayloadAction<AddAttributePayload>) => {
        const { attributeToSet, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const attribute = createAttribute(omit(attributeToSet, 'createComponent'));

        if (attribute.type === 'relation') {
          const target = attribute.target;
          const targetAttribute = attribute.targetAttribute || null;
          const relation = attribute.relation;
          const relationType = getRelationType(relation, targetAttribute);

          const isBidirectionalRelation =
            relationType !== undefined && !['oneWay', 'manyWay'].includes(relationType);

          if (isBidirectionalRelation) {
            const oppositeAttribute = createAttribute({
              name: targetAttribute,
              relation: getOppositeRelation(relationType),
              target: type.uid,
              targetAttribute: attribute.name,
              type: 'relation',
              private: attribute.private,
            });

            const targetType = getType(state, { forTarget, targetUid: target });
            pushAttribute(targetType, oppositeAttribute);
          }
        }

        pushAttribute(type, attribute);
        setStatus(type, 'CHANGED');
      },
      moveAttribute: (state, action: PayloadAction<MoveAttributePayload>) => {
        const { forTarget, targetUid, from, to } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const attribute = type.attributes[from];
        type.attributes.splice(from, 1);
        type.attributes.splice(to, 0, attribute);
        setStatus(type, 'CHANGED');
      },
      addCustomFieldAttribute: (state, action: PayloadAction<AddCustomFieldAttributePayload>) => {
        const { attributeToSet, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        pushAttribute(type, createAttribute(attributeToSet));
      },
      addCreatedComponentToDynamicZone: (
        state,
        action: PayloadAction<AddCreateComponentToDynamicZonePayload>
      ) => {
        const { dynamicZoneTarget, componentsToAdd, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const dzAttributeIndex = findAttributeIndex(type, dynamicZoneTarget);
        const attr = type.attributes[dzAttributeIndex] as Schema.Attribute.DynamicZone;

        componentsToAdd.forEach((componentUid: Internal.UID.Component) => {
          attr.components.push(componentUid);
        });

        setAttributeStatus(attr as AnyAttribute, 'CHANGED');
        setStatus(type, 'CHANGED');
      },
      changeDynamicZoneComponents: (
        state,
        action: PayloadAction<ChangeDynamicZoneComponentsPayload>
      ) => {
        const { dynamicZoneTarget, newComponents, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const dzAttributeIndex = findAttributeIndex(type, dynamicZoneTarget);
        const attr = type.attributes[dzAttributeIndex] as Schema.Attribute.DynamicZone;
        const currentDZComponents = attr.components;

        const updatedComponents = makeUnique([...currentDZComponents, ...newComponents]);

        setStatus(type, 'CHANGED');
        setAttributeStatus(attr as AnyAttribute, 'CHANGED');
        attr.components = updatedComponents;
      },
      editAttribute: (state, action: PayloadAction<EditAttributePayload>) => {
        const { name, attributeToSet, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const initialAttributeIndex = findAttributeIndex(type, name);

        if (initialAttributeIndex === -1) {
          return;
        }

        const previousAttribute = type.attributes[initialAttributeIndex];

        setAttributeAt(type, initialAttributeIndex, attributeToSet as AnyAttribute);

        if (previousAttribute.type !== attributeToSet.type) {
          return;
        }

        if (previousAttribute.type !== 'relation' || attributeToSet.type !== 'relation') {
          return;
        }

        const previousTarget = getType(state, {
          forTarget: 'contentType',
          targetUid: previousAttribute.target,
        });
        const newTarget = getType(state, {
          forTarget: 'contentType',
          targetUid: attributeToSet.target,
        });

        const previousTargetAttributeIndex = findAttributeIndex(
          previousTarget,
          previousAttribute.targetAttribute ?? ''
        );

        // remove old targetAttribute
        if (previousAttribute.targetAttribute) {
          removeAttributeByName(previousTarget, previousAttribute.targetAttribute);
        }

        const newRelationType = getRelationType(
          attributeToSet.relation,
          attributeToSet.targetAttribute
        );
        const isBidirectionnal =
          newRelationType !== undefined && !ONE_SIDE_RELATIONS.includes(newRelationType);

        if (isBidirectionnal) {
          const newTargetAttribute = {
            name: attributeToSet.targetAttribute,
            type: 'relation',
            relation: getOppositeRelation(attributeToSet.relation),
            targetAttribute: attributeToSet.name,
            target: type.uid,
            private: previousAttribute.private ?? attributeToSet.private,
            pluginOptions: previousAttribute.pluginOptions ?? attributeToSet.pluginOptions,
            status: 'CHANGED',
          } as AnyAttribute;

          // create or recreate(at old index) targetAttribute
          if (previousTargetAttributeIndex !== -1 && previousTarget.uid === newTarget.uid) {
            // re-create at previousIdx if possible
            replaceAttributeAt(newTarget, previousTargetAttributeIndex, newTargetAttribute);
          } else {
            pushAttribute(newTarget, {
              ...newTargetAttribute,
              status: 'NEW',
            });
          }
        }
      },
      editCustomFieldAttribute: (state, action: PayloadAction<EditCustomFieldAttributePayload>) => {
        const { forTarget, targetUid, name, attributeToSet } = action.payload;

        const initialAttributeName = name;
        const type = getType(state, { forTarget, targetUid });

        const initialAttributeIndex = findAttributeIndex(type, initialAttributeName);

        setAttributeAt(type, initialAttributeIndex, attributeToSet as AnyAttribute);
      },
      reloadPlugin: () => {
        return initialState;
      },
      removeComponentFromDynamicZone: (
        state,
        action: PayloadAction<RemoveComponentFromDynamicZonePayload>
      ) => {
        const { dzName, componentToRemoveIndex, forTarget, targetUid } = action.payload;

        const type =
          forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

        if (!type) {
          return;
        }

        const dzAttributeIndex = findAttributeIndex(type, dzName);
        const attr = type.attributes[dzAttributeIndex] as Schema.Attribute.DynamicZone;

        setStatus(type, 'CHANGED');
        setAttributeStatus(attr as AnyAttribute, 'CHANGED');
        attr.components.splice(componentToRemoveIndex, 1);
      },
      removeField: (state, action: PayloadAction<RemoveFieldPayload>) => {
        const { forTarget, targetUid, attributeToRemoveName } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const attributeToRemoveIndex = findAttributeIndex(type, attributeToRemoveName);
        const attribute = type.attributes[attributeToRemoveIndex];

        if (attribute.type === 'relation') {
          const { target, relation, targetAttribute: targetAttributeName } = attribute;
          const relationType = getRelationType(relation, targetAttributeName);

          const isBidirectionnal = !ONE_SIDE_RELATIONS.includes(relationType!);

          if (isBidirectionnal && targetAttributeName) {
            const targetContentType = getType(state, { forTarget, targetUid: target });
            const targetAttributeIndex = findAttributeIndex(targetContentType, targetAttributeName);

            removeAttributeAt(targetContentType, targetAttributeIndex);
          }
        }

        // Find all uid fields that have the targetField set to the field we are removing
        type.attributes.forEach((attribute) => {
          if (attribute.type === 'uid') {
            if (attribute.targetField === attributeToRemoveName) {
              delete attribute.targetField;
            }
          }
        });

        removeAttributeAt(type, attributeToRemoveIndex);
      },
      // only edits a component in practice
      updateComponentSchema: (state, action: PayloadAction<UpdateComponentSchemaPayload>) => {
        const { data, uid } = action.payload;

        const type = state.components[uid];
        if (!type) {
          return;
        }

        updateType(type, {
          info: {
            displayName: data.displayName,
            icon: data.icon,
          },
        });
      },
      updateComponentUid: (state, action: PayloadAction<UpdateComponentUIDPayload>) => {
        const { newComponentUID, uid } = action.payload;

        const type = state.components[uid];
        if (!type || type.status !== 'NEW') {
          return;
        }

        if (newComponentUID !== uid) {
          const newType = { ...type, uid: newComponentUID };
          state.components[newComponentUID] = newType;
          delete state.components[uid];

          // update the uid in the content types
          Object.keys(state.contentTypes).forEach((contentTypeUid) => {
            const contentType = state.contentTypes[contentTypeUid];

            contentType.attributes.forEach((attribute) => {
              if (attribute.type === 'dynamiczone') {
                const newComponents = attribute.components.map((component: UID.Component) => {
                  if (component === uid) {
                    return newComponentUID;
                  }

                  return component;
                });

                attribute.components = newComponents;
              }
            });

            contentType.attributes.forEach((attribute) => {
              if (attribute.type === 'component' && attribute.component === uid) {
                attribute.component = newComponentUID;
              }
            });
          });

          // update the uid in the other components
          Object.keys(state.components).forEach((componentUid) => {
            const component = state.components[componentUid];

            component.attributes.forEach((attribute) => {
              if (attribute.type === 'component' && attribute.component === uid) {
                attribute.component = newComponentUID;
              }
            });
          });
        }
      },
      updateSchema: (state, action: PayloadAction<UpdateSchemaPayload>) => {
        const { data, uid } = action.payload;

        const { displayName, kind, draftAndPublish, pluginOptions } = data;

        const type = state.contentTypes[uid];
        if (!type) {
          return;
        }

        const previousKind = type.kind;

        updateType(type, {
          info: {
            displayName,
          },
          kind,
          options: {
            draftAndPublish,
          },
          pluginOptions,
        });

        if (kind && kind !== previousKind) {
          const oldSection = state.contentStructure.sections[sectionKeyForKind(previousKind)];
          removeContentTypeChild(oldSection.groups, uid);
        }
      },
      deleteComponent: (state, action: PayloadAction<Internal.UID.Component>) => {
        const uid = action.payload;

        // remove the compo from the components
        if (state.components[uid].status === 'NEW') {
          delete state.components[uid];
        } else {
          setStatus(state.components[uid], 'REMOVED');
        }

        // remove the compo from the content types
        Object.keys(state.contentTypes).forEach((contentTypeUid) => {
          const contentType = state.contentTypes[contentTypeUid];

          // remove from dynamic zones
          contentType.attributes.forEach((attribute) => {
            if (attribute.type === 'dynamiczone') {
              const newComponents = attribute.components.filter(
                (component: unknown) => component !== uid
              );

              attribute.components = newComponents;
            }
          });

          contentType.attributes.forEach((attribute) => {
            if (attribute.type === 'component' && attribute.component === uid) {
              removeAttributeByName(contentType, attribute.name);
            }
          });
        });

        // remove the compo from other components
        Object.keys(state.components).forEach((componentUid) => {
          const component = state.components[componentUid];

          component.attributes.forEach((attribute) => {
            if (attribute.type === 'component' && attribute.component === uid) {
              removeAttributeByName(component, attribute.name);
            }
          });
        });
      },
      deleteContentType: (state, action: PayloadAction<Internal.UID.ContentType>) => {
        const uid = action.payload;
        const type = state.contentTypes[uid];

        // just drop new content types
        if (type.status === 'NEW') {
          delete state.contentTypes[uid];
        } else {
          setStatus(type, 'REMOVED');
        }

        // remove the content type from the components
        Object.keys(state.components).forEach((componentUid) => {
          const component = state.components[componentUid];

          component.attributes.forEach((attribute) => {
            if (attribute.type === 'relation' && attribute.target === uid) {
              removeAttributeByName(component, attribute.name);
            }
          });
        });

        // remove the content type from the content types
        Object.keys(state.contentTypes).forEach((contentTypeUid) => {
          const contentType = state.contentTypes[contentTypeUid];

          contentType.attributes.forEach((attribute) => {
            if (attribute.type === 'relation' && attribute.target === uid) {
              removeAttributeByName(contentType, attribute.name);
            }
          });
        });
      },

      createFolder: (state, action: PayloadAction<CreateFolderPayload>) => {
        const { section, id, name, parentId } = action.payload;
        const { groups } = state.contentStructure.sections[section];

        // Refuse creation of a folder that would exceed the maximum allowed depth.
        if (parentId && getGroupDepth(groups, parentId) + 1 > MAX_FOLDER_DEPTH) {
          return;
        }

        groups.push({ id, name, parent: parentId, children: [], status: 'NEW' });

        if (parentId) {
          const parent = findGroup(groups, parentId);

          if (parent) {
            parent.children.push({ type: 'group', id });
            setGroupStatus(parent, 'CHANGED');
          }
        }
      },
      renameFolder: (state, action: PayloadAction<RenameFolderPayload>) => {
        const { section, id, name } = action.payload;

        const group = findGroup(state.contentStructure.sections[section].groups, id);
        if (!group) {
          return;
        }

        group.name = name;
        setGroupStatus(group, 'CHANGED');
      },
      moveFolder: (state, action: PayloadAction<MoveFolderPayload>) => {
        const { section, id, newParentId, index } = action.payload;
        const { groups } = state.contentStructure.sections[section];

        const group = findGroup(groups, id);
        if (!group) {
          return;
        }

        // Reject no-ops and cyclic moves
        if (newParentId === id || (newParentId && isDescendantGroup(groups, id, newParentId))) {
          return;
        }

        // Refuse moves that would exceed the maximum allowed depth.
        const newTopDepth = newParentId ? getGroupDepth(groups, newParentId) + 1 : 1;
        if (newTopDepth + getSubtreeHeight(groups, id) > MAX_FOLDER_DEPTH) {
          return;
        }

        if (group.parent) {
          const oldParent = findGroup(groups, group.parent);

          if (oldParent) {
            // Remove from the old parent's list of children.
            const idx = oldParent.children.findIndex((child) => {
              return child.type === 'group' && child.id === id;
            });

            if (idx !== -1) {
              oldParent.children.splice(idx, 1);
            }

            setGroupStatus(oldParent, 'CHANGED');
          }
        }

        group.parent = newParentId;
        setGroupStatus(group, 'CHANGED');

        if (newParentId) {
          const newParent = findGroup(groups, newParentId);

          if (newParent) {
            const entry = { type: 'group' as const, id };

            if (typeof index === 'number' && index >= 0 && index <= newParent.children.length) {
              newParent.children.splice(index, 0, entry);
            } else {
              newParent.children.push(entry);
            }

            setGroupStatus(newParent, 'CHANGED');
          }
        }
      },
      deleteFolderOnly: (state, action: PayloadAction<DeleteFolderPayload>) => {
        const { section, id: groupToDeleteId } = action.payload;
        const { groups } = state.contentStructure.sections[section];

        const groupToDelete = findGroup(groups, groupToDeleteId);
        if (!groupToDelete) {
          return;
        }

        const groupToDeleteParentId = groupToDelete.parent;

        // It is necessary to clone the children because we must subsequently mutate the original group.children array when we splice it out of its parent.
        const children = groupToDelete.children.map((child) => ({ ...child }));

        // Children of a deleted folder inherit the deleted folder's parent.
        children.forEach((child) => {
          if (child.type === 'group') {
            const childGroup = findGroup(groups, child.id);

            if (childGroup) {
              childGroup.parent = groupToDeleteParentId;
            }
          }
        });

        if (groupToDeleteParentId) {
          const groupToDeleteParent = findGroup(groups, groupToDeleteParentId);

          if (groupToDeleteParent) {
            // Splice the deleted folder's children of the deleted folder into their new parent at the position of the deleted folder.
            const groupToDeleteIndex = groupToDeleteParent.children.findIndex((child) => {
              return child.type === 'group' && child.id === groupToDeleteId;
            });

            if (groupToDeleteIndex !== -1) {
              groupToDeleteParent.children.splice(groupToDeleteIndex, 1, ...children);
            } else {
              groupToDeleteParent.children.push(...children);
            }

            setGroupStatus(groupToDeleteParent, 'CHANGED');
          }
        }

        // Finally, remove the deleted folder from its section's list of groups.
        const groupIndex = groups.findIndex((candidate) => {
          return candidate.id === groupToDeleteId;
        });

        if (groupIndex !== -1) {
          groups.splice(groupIndex, 1);
        }
      },
      deleteFolderAndSubtree: (state, action: PayloadAction<DeleteFolderPayload>) => {
        const { section, id: groupToDeleteId } = action.payload;
        const { groups } = state.contentStructure.sections[section];

        const groupToDelete = findGroup(groups, groupToDeleteId);
        if (!groupToDelete) {
          return;
        }

        const toRemove = new Set<string>();
        const collect = (currentGroupId: string) => {
          toRemove.add(currentGroupId);

          const currentGroup = findGroup(groups, currentGroupId);

          for (const child of currentGroup?.children ?? []) {
            if (child.type !== 'group') continue;
            collect(child.id);
          }
        };

        collect(groupToDeleteId);

        if (groupToDelete.parent) {
          const groupToDeleteParent = findGroup(groups, groupToDelete.parent);

          if (groupToDeleteParent) {
            const groupToDeleteIndex = groupToDeleteParent.children.findIndex((child) => {
              return child.type === 'group' && child.id === groupToDeleteId;
            });

            if (groupToDeleteIndex !== -1) {
              groupToDeleteParent.children.splice(groupToDeleteIndex, 1);
            }

            setGroupStatus(groupToDeleteParent, 'CHANGED');
          }
        }

        // Removes the group entry and all its descendants from the contentStructure.
        state.contentStructure.sections[section].groups = groups.filter((candidate) => {
          return !toRemove.has(candidate.id);
        });
      },
      assignContentTypeToFolder: (
        state,
        action: PayloadAction<AssignContentTypeToFolderPayload>
      ) => {
        const { section, uid, targetGroupId, index } = action.payload;
        const { groups } = state.contentStructure.sections[section];

        removeContentTypeChild(groups, uid);

        if (targetGroupId) {
          const targetGroup = findGroup(groups, targetGroupId);

          if (targetGroup) {
            const entry = { type: 'contentType' as const, uid };

            if (typeof index === 'number' && index >= 0 && index <= targetGroup.children.length) {
              targetGroup.children.splice(index, 0, entry);
            } else {
              targetGroup.children.push(entry);
            }

            setGroupStatus(targetGroup, 'CHANGED');
          }
        }
      },
      reorderFolderChildren: (state, action: PayloadAction<ReorderFolderChildrenPayload>) => {
        const { section, groupId, from, to } = action.payload;

        const group = findGroup(state.contentStructure.sections[section].groups, groupId);
        if (!group) {
          return;
        }

        const child = group.children[from];
        if (!child) {
          return;
        }

        group.children.splice(from, 1);
        group.children.splice(to, 0, child);

        setGroupStatus(group, 'CHANGED');
      },

      applyChange(
        state,
        reducerAction: PayloadAction<{
          action: 'add' | 'update' | 'delete';
          schema: ContentType | Component;
        }>
      ) {
        const { action, schema } = reducerAction.payload;

        switch (action) {
          case 'add':
            {
              const uid = schema.uid;

              if (schema.modelType === 'component') {
                state.components[uid] = schema;
              } else {
                state.contentTypes[uid] = schema;
              }
            }
            break;
          case 'update':
            {
              const uid = schema.uid;

              // Find the schema, if the state was "create", we should keep it as it was before

              if (schema.modelType === 'component') {
                const component = state.components[uid];
                state.components[uid] = {
                  ...schema,
                  status: component?.status === 'NEW' ? 'NEW' : schema.status,
                };
              } else {
                const contentType = state.contentTypes[uid];
                state.contentTypes[uid] = {
                  ...schema,
                  status: contentType?.status === 'NEW' ? 'NEW' : schema.status,
                };
              }
            }
            break;
          case 'delete': {
            const uid = schema.uid;
            const isComponent = schema.modelType === 'component';
            // It's a component that has yet not been added
            if (isComponent) {
              const exists = state.components[uid];
              if (!exists) {
                return;
              }

              const isUnsaved = state.components[uid]?.status === 'NEW';
              if (isUnsaved) {
                delete state.components[uid];
              } else {
                state.components[uid].status = 'REMOVED';
              }
            } else {
              const exists = state.contentTypes[uid];
              if (!exists) {
                return;
              }

              const isUnsaved = state.contentTypes[uid]?.status === 'NEW';
              if (isUnsaved) {
                delete state.contentTypes[uid];
              } else {
                state.contentTypes[uid].status = 'REMOVED';
              }
            }

            break;
          }
        }
      },
    },
  },

  {
    limit: 50,
    excludeActionsFromHistory: ['reloadPlugin', 'init'],
    stateSelector: (state) => {
      if (!state) {
        return {};
      }

      return {
        components: state.components,
        contentTypes: state.contentTypes,
        contentStructure: state.contentStructure,
      };
    },
    discard: (state) => {
      state.components = state.initialComponents;
      state.contentTypes = state.initialContentTypes;
      state.contentStructure = state.initialContentStructure;
    },
  }
);

export type State = ReturnType<typeof slice.reducer>;
export const { reducer, actions } = slice;
export { initialState };
