import { actions, reducer } from '../../../DataManager/reducer';
import { init, initCT } from '../../../DataManager/tests/utils';
import { applyCTBOperations } from '../applyCTBOperations';

import type { ApplyCTBOperationsDataManager } from '../applyCTBOperations';
import type { CTBOperation } from '../types/ctbOperations';

const createMockDataManager = () => ({
  createSchema: jest.fn(),
  createComponentSchema: jest.fn(),
  addAttribute: jest.fn(),
  editAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  updateSchema: jest.fn(),
  updateComponentSchema: jest.fn(),
  deleteContentType: jest.fn(),
  deleteComponent: jest.fn(),
  changeDynamicZoneComponents: jest.fn(),
  removeComponentFromDynamicZone: jest.fn(),
  moveAttribute: jest.fn(),
  addCreatedComponentToDynamicZone: jest.fn(),
  addCustomFieldAttribute: jest.fn(),
  editCustomFieldAttribute: jest.fn(),
  updateComponentUid: jest.fn(),
});

describe('applyCTBOperations', () => {
  describe('dispatcher (mocked DataManager)', () => {
    it('calls editAttribute for a simple rename', () => {
      const dm = createMockDataManager();
      const operations: CTBOperation[] = [
        {
          op: 'editAttribute',
          forTarget: 'contentType',
          targetUid: 'api::article.article',
          name: 'title',
          attributeToSet: {
            name: 'heading',
            type: 'string',
            required: true,
          },
        },
      ];

      applyCTBOperations(operations, dm);

      expect(dm.editAttribute).toHaveBeenCalledTimes(1);
      expect(dm.editAttribute).toHaveBeenCalledWith({
        forTarget: 'contentType',
        targetUid: 'api::article.article',
        name: 'title',
        attributeToSet: {
          name: 'heading',
          type: 'string',
          required: true,
        },
      });
    });

    it('calls editAttribute in order for a swap (three hops)', () => {
      const dm = createMockDataManager();
      const operations: CTBOperation[] = [
        {
          op: 'editAttribute',
          forTarget: 'contentType',
          targetUid: 'api::x.x',
          name: 'a',
          attributeToSet: { name: '__ctb_swap_tmp', type: 'string' },
        },
        {
          op: 'editAttribute',
          forTarget: 'contentType',
          targetUid: 'api::x.x',
          name: 'b',
          attributeToSet: { name: 'a', type: 'string' },
        },
        {
          op: 'editAttribute',
          forTarget: 'contentType',
          targetUid: 'api::x.x',
          name: '__ctb_swap_tmp',
          attributeToSet: { name: 'b', type: 'string' },
        },
      ];

      applyCTBOperations(operations, dm);

      expect(dm.editAttribute).toHaveBeenCalledTimes(3);
      expect(dm.editAttribute.mock.calls).toEqual([
        [
          {
            forTarget: 'contentType',
            targetUid: 'api::x.x',
            name: 'a',
            attributeToSet: { name: '__ctb_swap_tmp', type: 'string' },
          },
        ],
        [
          {
            forTarget: 'contentType',
            targetUid: 'api::x.x',
            name: 'b',
            attributeToSet: { name: 'a', type: 'string' },
          },
        ],
        [
          {
            forTarget: 'contentType',
            targetUid: 'api::x.x',
            name: '__ctb_swap_tmp',
            attributeToSet: { name: 'b', type: 'string' },
          },
        ],
      ]);
    });

    it('maps uid to componentUID for updateComponentSchema', () => {
      const dm = createMockDataManager();

      applyCTBOperations(
        [
          {
            op: 'updateComponentSchema',
            uid: 'default.hero',
            data: { icon: 'star', displayName: 'Hero', category: 'sections' },
          },
        ],
        dm
      );

      expect(dm.updateComponentSchema).toHaveBeenCalledWith({
        componentUID: 'default.hero',
        data: { icon: 'star', displayName: 'Hero', category: 'sections' },
      });
    });

    it('maps uid to componentUID for updateComponentUid', () => {
      const dm = createMockDataManager();

      applyCTBOperations(
        [
          {
            op: 'updateComponentUid',
            uid: 'default.hero',
            newComponentUID: 'default.hero-block',
          },
        ],
        dm
      );

      expect(dm.updateComponentUid).toHaveBeenCalledWith({
        componentUID: 'default.hero',
        newComponentUID: 'default.hero-block',
      });
    });

    it('dispatches deleteContentType directly when dispatch is provided (bypass confirm)', () => {
      const dm = createMockDataManager();
      const dispatch = jest.fn();

      applyCTBOperations([{ op: 'deleteContentType', uid: 'api::article.article' }], dm, {
        dispatch,
      });

      expect(dispatch).toHaveBeenCalledWith(actions.deleteContentType('api::article.article'));
      expect(dm.deleteContentType).not.toHaveBeenCalled();
    });

    it('dispatches deleteComponent directly when dispatch is provided (bypass confirm)', () => {
      const dm = createMockDataManager();
      const dispatch = jest.fn();

      applyCTBOperations([{ op: 'deleteComponent', uid: 'default.hero' }], dm, { dispatch });

      expect(dispatch).toHaveBeenCalledWith(actions.deleteComponent('default.hero'));
      expect(dm.deleteComponent).not.toHaveBeenCalled();
    });
  });

  describe('reducer integration', () => {
    const uid = 'api::article.article';

    const buildDispatchingDataManager = (dispatch: (action: unknown) => void) =>
      ({
        createSchema: (payload) => dispatch(actions.createSchema(payload)),
        createComponentSchema: (payload) => dispatch(actions.createComponentSchema(payload)),
        addAttribute: (payload) => dispatch(actions.addAttribute(payload)),
        editAttribute: (payload) => dispatch(actions.editAttribute(payload)),
        removeAttribute: (payload) => dispatch(actions.removeField(payload)),
        updateSchema: (payload) => dispatch(actions.updateSchema(payload)),
        updateComponentSchema: (payload) =>
          dispatch(
            actions.updateComponentSchema({ uid: payload.componentUID, data: payload.data })
          ),
        deleteContentType: (contentTypeUid) => dispatch(actions.deleteContentType(contentTypeUid)),
        deleteComponent: (componentUid) => dispatch(actions.deleteComponent(componentUid)),
        changeDynamicZoneComponents: (payload) =>
          dispatch(actions.changeDynamicZoneComponents(payload)),
        removeComponentFromDynamicZone: (payload) =>
          dispatch(actions.removeComponentFromDynamicZone(payload)),
        moveAttribute: (payload) => dispatch(actions.moveAttribute(payload)),
        addCreatedComponentToDynamicZone: (payload) =>
          dispatch(actions.addCreatedComponentToDynamicZone(payload)),
        addCustomFieldAttribute: (payload) => dispatch(actions.addCustomFieldAttribute(payload)),
        editCustomFieldAttribute: (payload) => dispatch(actions.editCustomFieldAttribute(payload)),
        updateComponentUid: (payload) =>
          dispatch(
            actions.updateComponentUid({
              uid: payload.componentUID,
              newComponentUID: payload.newComponentUID,
            })
          ),
      }) satisfies ApplyCTBOperationsDataManager;

    it('produces renames[] for a simple rename via editAttribute', () => {
      let state = init({
        contentTypes: {
          [uid]: initCT('article', {
            attributes: [{ name: 'title', type: 'string', status: 'UNCHANGED' }],
          }),
        },
      });

      const dispatch = (action: unknown) => {
        state = reducer(state, action as never);
      };

      applyCTBOperations(
        [
          {
            op: 'editAttribute',
            forTarget: 'contentType',
            targetUid: uid,
            name: 'title',
            attributeToSet: { name: 'heading', type: 'string', required: true },
          },
        ],
        buildDispatchingDataManager(dispatch)
      );

      expect(state.current.contentTypes[uid].renames).toEqual([
        { oldName: 'title', newName: 'heading' },
      ]);
    });

    it('records ordered rename hops for a swap sequence', () => {
      let state = init({
        contentTypes: {
          [uid]: initCT('article', {
            attributes: [
              { name: 'a', type: 'string', status: 'UNCHANGED' },
              { name: 'b', type: 'string', status: 'UNCHANGED' },
            ],
          }),
        },
      });

      const dispatch = (action: unknown) => {
        state = reducer(state, action as never);
      };

      applyCTBOperations(
        [
          {
            op: 'editAttribute',
            forTarget: 'contentType',
            targetUid: uid,
            name: 'a',
            attributeToSet: { name: '__ctb_swap_tmp', type: 'string' },
          },
          {
            op: 'editAttribute',
            forTarget: 'contentType',
            targetUid: uid,
            name: 'b',
            attributeToSet: { name: 'a', type: 'string' },
          },
          {
            op: 'editAttribute',
            forTarget: 'contentType',
            targetUid: uid,
            name: '__ctb_swap_tmp',
            attributeToSet: { name: 'b', type: 'string' },
          },
        ],
        buildDispatchingDataManager(dispatch)
      );

      expect(state.current.contentTypes[uid].renames).toEqual([
        { oldName: 'a', newName: '__ctb_swap_tmp' },
        { oldName: 'b', newName: 'a' },
        { oldName: '__ctb_swap_tmp', newName: 'b' },
      ]);
    });

    it('deleteContentType bypasses provider confirm via dispatch option', () => {
      let state = init({
        contentTypes: {
          [uid]: initCT('article', { attributes: [] }),
        },
      });

      const dispatch = jest.fn((action: unknown) => {
        state = reducer(state, action as never);
      });

      const dm = createMockDataManager();

      applyCTBOperations([{ op: 'deleteContentType', uid }], dm, { dispatch });

      expect(dispatch).toHaveBeenCalledWith(actions.deleteContentType(uid));
      expect(dm.deleteContentType).not.toHaveBeenCalled();
      expect(state.current.contentTypes[uid].status).toBe('REMOVED');
    });
  });
});
