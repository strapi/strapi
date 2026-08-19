import { actions, initialState, reducer } from '../reducer';
import { CONTENT_STRUCTURE_VERSION } from '../utils/contentStructure';

import type { ContentType, Status } from '../../../types';
import type {
  ContentStructure,
  ContentStructureChild,
  ContentStructureGroup,
  GroupStatus,
} from '../utils/contentStructure';
import type { UID } from '@strapi/types';

const grp = (
  id: string,
  name: string,
  parent: string | null,
  children: ContentStructureChild[] = [],
  status: GroupStatus = 'UNCHANGED'
): ContentStructureGroup => ({ id, name, parent, children, status });

const groupChild = (id: string): ContentStructureChild => ({ type: 'group', id });
const ctChild = (uid: string): ContentStructureChild => ({
  type: 'contentType',
  uid: uid as UID.ContentType,
});

const ct = (uid: string, status: Status = 'NEW'): ContentType => ({
  uid: uid as UID.ContentType,
  attributes: [],
  modelType: 'contentType',
  kind: 'collectionType',
  info: { displayName: uid, singularName: uid, pluralName: uid },
  globalId: uid,
  modelName: uid,
  status,
  visible: true,
  restrictRelationsTo: [],
});

type WrappedState = { current: { contentStructure: ContentStructure } };

const stateWith = (
  collectionTypes: ContentStructureGroup[],
  singleTypes: ContentStructureGroup[] = []
) => ({
  past: [],
  future: [],
  current: {
    ...initialState,
    contentStructure: {
      version: CONTENT_STRUCTURE_VERSION,
      sections: {
        collectionTypes: { groups: collectionTypes },
        singleTypes: { groups: singleTypes },
      },
    } satisfies ContentStructure,
  },
});

const groupsOf = (state: WrappedState) =>
  state.current.contentStructure.sections.collectionTypes.groups;
const findGroup = (state: WrappedState, id: string) =>
  groupsOf(state).find((group) => group.id === id);

const section = 'collectionTypes' as const;

describe('Content Type Builder | DataManager | reducer | folder actions', () => {
  describe('createFolder', () => {
    it('adds a root folder with NEW status', () => {
      const next = reducer(
        stateWith([]),
        actions.createFolder({ section, id: 'grp_a', name: 'A', parentId: null })
      );

      expect(findGroup(next, 'grp_a')).toEqual({
        id: 'grp_a',
        name: 'A',
        parent: null,
        children: [],
        status: 'NEW',
      });
    });

    it('links a nested folder into its parent and marks the parent CHANGED', () => {
      const next = reducer(
        stateWith([grp('grp_parent', 'Parent', null)]),
        actions.createFolder({ section, id: 'grp_child', name: 'Child', parentId: 'grp_parent' })
      );

      const parent = findGroup(next, 'grp_parent');
      expect(parent?.children).toEqual([groupChild('grp_child')]);
      expect(parent?.status).toBe('CHANGED');
      expect(findGroup(next, 'grp_child')?.parent).toBe('grp_parent');
    });

    it('allows a create at exactly the maximum depth', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'A', null, [groupChild('grp_b')]), grp('grp_b', 'B', 'grp_a')]),
        actions.createFolder({ section, id: 'grp_c', name: 'C', parentId: 'grp_b' })
      );

      expect(findGroup(next, 'grp_c')?.parent).toBe('grp_b');
    });

    it('refuses a create that would exceed the maximum depth, produces no changes in tree', () => {
      const before = stateWith([
        grp('grp_a', 'A', null, [groupChild('grp_b')]),
        grp('grp_b', 'B', 'grp_a', [groupChild('grp_c')]),
        grp('grp_c', 'C', 'grp_b'),
      ]);
      const next = reducer(
        before,
        actions.createFolder({ section, id: 'grp_d', name: 'D', parentId: 'grp_c' })
      );

      expect(findGroup(next, 'grp_d')).toBeUndefined();
      expect(groupsOf(next)).toEqual(groupsOf(before));
    });
  });

  describe('renameFolder', () => {
    it('renames an existing folder and marks it CHANGED', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'Old', null)]),
        actions.renameFolder({ section, id: 'grp_a', name: 'New' })
      );

      expect(findGroup(next, 'grp_a')).toMatchObject({ name: 'New', status: 'CHANGED' });
    });

    it('keeps a freshly-created (NEW) folder NEW after a rename', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'Old', null, [], 'NEW')]),
        actions.renameFolder({ section, id: 'grp_a', name: 'New' })
      );

      expect(findGroup(next, 'grp_a')?.status).toBe('NEW');
    });

    it('is a no-op for an unknown id', () => {
      const before = stateWith([grp('grp_a', 'A', null)]);
      const next = reducer(before, actions.renameFolder({ section, id: 'grp_missing', name: 'X' }));

      expect(groupsOf(next)).toEqual(groupsOf(before));
    });
  });

  describe('moveFolder', () => {
    it('moves a root folder under a new parent, marking both CHANGED', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'A', null), grp('grp_b', 'B', null)]),
        actions.moveFolder({ section, id: 'grp_a', newParentId: 'grp_b' })
      );

      expect(findGroup(next, 'grp_a')).toMatchObject({ parent: 'grp_b', status: 'CHANGED' });
      const b = findGroup(next, 'grp_b');
      expect(b?.children).toEqual([groupChild('grp_a')]);
      expect(b?.status).toBe('CHANGED');
    });

    it('detaches the folder from its old parent', () => {
      const next = reducer(
        stateWith([
          grp('grp_p', 'P', null, [groupChild('grp_c')]),
          grp('grp_c', 'C', 'grp_p'),
          grp('grp_q', 'Q', null),
        ]),
        actions.moveFolder({ section, id: 'grp_c', newParentId: 'grp_q' })
      );

      expect(findGroup(next, 'grp_p')?.children).toEqual([]);
      expect(findGroup(next, 'grp_q')?.children).toEqual([groupChild('grp_c')]);
      expect(findGroup(next, 'grp_c')?.parent).toBe('grp_q');
    });

    it('moves a folder to root when the new parent is null', () => {
      const next = reducer(
        stateWith([grp('grp_p', 'P', null, [groupChild('grp_c')]), grp('grp_c', 'C', 'grp_p')]),
        actions.moveFolder({ section, id: 'grp_c', newParentId: null })
      );

      expect(findGroup(next, 'grp_c')?.parent).toBeNull();
      expect(findGroup(next, 'grp_p')?.children).toEqual([]);
    });

    it('rejects moving a folder into itself', () => {
      const before = stateWith([grp('grp_a', 'A', null)]);
      const next = reducer(
        before,
        actions.moveFolder({ section, id: 'grp_a', newParentId: 'grp_a' })
      );

      expect(groupsOf(next)).toEqual(groupsOf(before));
    });

    it('rejects a cyclic move into a descendant', () => {
      const before = stateWith([
        grp('grp_a', 'A', null, [groupChild('grp_b')]),
        grp('grp_b', 'B', 'grp_a'),
      ]);
      const next = reducer(
        before,
        actions.moveFolder({ section, id: 'grp_a', newParentId: 'grp_b' })
      );

      // The move should be rejected completely and produce no changes to the state.
      expect(groupsOf(next)).toEqual(groupsOf(before));
    });

    it('inserts the folder at the requested index in the new parent', () => {
      const next = reducer(
        stateWith([
          grp('grp_target', 'Target', null, [ctChild('api::x.x'), ctChild('api::y.y')]),
          grp('grp_c', 'C', null),
        ]),
        actions.moveFolder({ section, id: 'grp_c', newParentId: 'grp_target', index: 1 })
      );

      expect(findGroup(next, 'grp_target')?.children).toEqual([
        ctChild('api::x.x'),
        groupChild('grp_c'),
        ctChild('api::y.y'),
      ]);
    });

    it('allows a move that lands exactly at the maximum depth', () => {
      const next = reducer(
        stateWith([
          grp('grp_a', 'A', null, [groupChild('grp_b')]),
          grp('grp_b', 'B', 'grp_a'),
          grp('grp_x', 'X', null),
        ]),
        actions.moveFolder({ section, id: 'grp_x', newParentId: 'grp_b' })
      );

      expect(findGroup(next, 'grp_x')?.parent).toBe('grp_b');
      expect(findGroup(next, 'grp_b')?.children).toEqual([groupChild('grp_x')]);
    });

    it('refuses a move that would nest the folder past the maximum depth', () => {
      const before = stateWith([
        grp('grp_a', 'A', null, [groupChild('grp_b')]),
        grp('grp_b', 'B', 'grp_a', [groupChild('grp_c')]),
        grp('grp_c', 'C', 'grp_b'),
        grp('grp_x', 'X', null),
      ]);

      const next = reducer(
        before,
        actions.moveFolder({ section, id: 'grp_x', newParentId: 'grp_c' })
      );

      expect(groupsOf(next)).toEqual(groupsOf(before));
    });

    it('refuses a move whose subtree would exceed the maximum depth', () => {
      const before = stateWith([
        grp('grp_a', 'A', null, [groupChild('grp_b')]),
        grp('grp_b', 'B', 'grp_a'),
        grp('grp_x', 'X', null, [groupChild('grp_y')]),
        grp('grp_y', 'Y', 'grp_x'),
      ]);

      const next = reducer(
        before,
        actions.moveFolder({ section, id: 'grp_x', newParentId: 'grp_b' })
      );

      expect(groupsOf(next)).toEqual(groupsOf(before));
    });
  });

  describe('deleteFolderOnly', () => {
    it('reparents children into the grandparent at the deleted folder position', () => {
      const next = reducer(
        stateWith([
          grp('grp_g', 'G', null, [groupChild('grp_p')]),
          grp('grp_p', 'P', 'grp_g', [groupChild('grp_c'), ctChild('api::z.z')]),
          grp('grp_c', 'C', 'grp_p'),
        ]),
        actions.deleteFolderOnly({ section, id: 'grp_p' })
      );

      expect(findGroup(next, 'grp_p')).toBeUndefined();
      expect(findGroup(next, 'grp_c')?.parent).toBe('grp_g');
      const g = findGroup(next, 'grp_g');
      expect(g?.children).toEqual([groupChild('grp_c'), ctChild('api::z.z')]);
      expect(g?.status).toBe('CHANGED');
    });

    it('reparents children to root when deleting a root folder', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'A', null, [groupChild('grp_b')]), grp('grp_b', 'B', 'grp_a')]),
        actions.deleteFolderOnly({ section, id: 'grp_a' })
      );

      expect(findGroup(next, 'grp_a')).toBeUndefined();
      expect(findGroup(next, 'grp_b')?.parent).toBeNull();
    });

    it('is a no-op for an unknown id', () => {
      const before = stateWith([grp('grp_a', 'A', null)]);
      const next = reducer(before, actions.deleteFolderOnly({ section, id: 'grp_missing' }));

      expect(groupsOf(next)).toEqual(groupsOf(before));
    });
  });

  describe('deleteFolderAndSubtree', () => {
    it('removes the folder and every descendant', () => {
      const next = reducer(
        stateWith([
          grp('grp_g', 'G', null, [groupChild('grp_p')]),
          grp('grp_p', 'P', 'grp_g', [groupChild('grp_c')]),
          grp('grp_c', 'C', 'grp_p', [ctChild('api::z.z')]),
        ]),
        actions.deleteFolderAndSubtree({ section, id: 'grp_p' })
      );

      expect(groupsOf(next).map((group) => group.id)).toEqual(['grp_g']);
      expect(findGroup(next, 'grp_g')?.children).toEqual([]);
      expect(findGroup(next, 'grp_g')?.status).toBe('CHANGED');
    });

    it('is a no-op for an unknown id', () => {
      const before = stateWith([grp('grp_a', 'A', null)]);
      const next = reducer(before, actions.deleteFolderAndSubtree({ section, id: 'grp_missing' }));

      expect(groupsOf(next)).toEqual(groupsOf(before));
    });
  });

  describe('assignContentTypeToFolder', () => {
    it('adds a content type to a folder and marks it CHANGED', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'A', null)]),
        actions.assignContentTypeToFolder({
          section,
          uid: 'api::x.x' as UID.ContentType,
          targetGroupId: 'grp_a',
        })
      );

      const a = findGroup(next, 'grp_a');
      expect(a?.children).toEqual([ctChild('api::x.x')]);
      expect(a?.status).toBe('CHANGED');
    });

    it('moves a content type from one folder to another', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'A', null, [ctChild('api::x.x')]), grp('grp_b', 'B', null)]),
        actions.assignContentTypeToFolder({
          section,
          uid: 'api::x.x' as UID.ContentType,
          targetGroupId: 'grp_b',
        })
      );

      expect(findGroup(next, 'grp_a')?.children).toEqual([]);
      expect(findGroup(next, 'grp_a')?.status).toBe('CHANGED');
      expect(findGroup(next, 'grp_b')?.children).toEqual([ctChild('api::x.x')]);
      expect(findGroup(next, 'grp_b')?.status).toBe('CHANGED');
    });

    it('ungroups a content type when the target is null', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'A', null, [ctChild('api::x.x')])]),
        actions.assignContentTypeToFolder({
          section,
          uid: 'api::x.x' as UID.ContentType,
          targetGroupId: null,
        })
      );

      expect(findGroup(next, 'grp_a')?.children).toEqual([]);
    });

    it('inserts the content type at the requested index', () => {
      const next = reducer(
        stateWith([grp('grp_a', 'A', null, [ctChild('api::p.p'), ctChild('api::q.q')])]),
        actions.assignContentTypeToFolder({
          section,
          uid: 'api::x.x' as UID.ContentType,
          targetGroupId: 'grp_a',
          index: 1,
        })
      );

      expect(findGroup(next, 'grp_a')?.children).toEqual([
        ctChild('api::p.p'),
        ctChild('api::x.x'),
        ctChild('api::q.q'),
      ]);
    });
  });

  describe('deleteContentType', () => {
    it('detaches a deleted NEW content type from its folder and marks it CHANGED', () => {
      const uid = 'api::foo.foo';
      const state = stateWith([grp('grp_a', 'A', null, [ctChild(uid), ctChild('api::bar.bar')])]);
      state.current.contentTypes = { [uid]: ct(uid, 'NEW') };

      const next = reducer(state, actions.deleteContentType(uid as UID.ContentType));

      expect(findGroup(next, 'grp_a')?.children).toEqual([ctChild('api::bar.bar')]);
      expect(findGroup(next, 'grp_a')?.status).toBe('CHANGED');
      expect(next.current.contentTypes[uid]).toBeUndefined();
    });

    it('detaches a deleted saved content type from its folder', () => {
      const uid = 'api::foo.foo';
      const state = stateWith([grp('grp_a', 'A', null, [ctChild(uid)])]);
      state.current.contentTypes = { [uid]: ct(uid, 'UNCHANGED') };

      const next = reducer(state, actions.deleteContentType(uid as UID.ContentType));

      expect(findGroup(next, 'grp_a')?.children).toEqual([]);
      expect(next.current.contentTypes[uid]?.status).toBe('REMOVED');
    });

    it('leaves the tree untouched when the deleted type is in no folder', () => {
      const uid = 'api::foo.foo';
      const before = stateWith([grp('grp_a', 'A', null)]);
      before.current.contentTypes = { [uid]: ct(uid, 'NEW') };

      const next = reducer(before, actions.deleteContentType(uid as UID.ContentType));

      expect(groupsOf(next)).toEqual(groupsOf(before));
    });
  });

  describe('reorderFolderChildren', () => {
    it('reorders children within a folder and marks it CHANGED', () => {
      const next = reducer(
        stateWith([
          grp('grp_a', 'A', null, [ctChild('api::p.p'), ctChild('api::q.q'), ctChild('api::r.r')]),
        ]),
        actions.reorderFolderChildren({ section, groupId: 'grp_a', from: 0, to: 2 })
      );

      const a = findGroup(next, 'grp_a');
      expect(a?.children).toEqual([ctChild('api::q.q'), ctChild('api::r.r'), ctChild('api::p.p')]);
      expect(a?.status).toBe('CHANGED');
    });

    it('is a no-op for an unknown group', () => {
      const before = stateWith([grp('grp_a', 'A', null, [ctChild('api::p.p')])]);
      const next = reducer(
        before,
        actions.reorderFolderChildren({ section, groupId: 'grp_missing', from: 0, to: 0 })
      );

      expect(groupsOf(next)).toEqual(groupsOf(before));
    });
  });
});
