import * as React from 'react';

import { MemoryRouter } from 'react-router-dom';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { renderHook, act } from '@testing-library/react-hooks';

import useSelect from '../select';

const SELECT_ATTR_FIXTURE = {
  isUserAllowedToEditField: true,
  isUserAllowedToReadField: true,
  name: 'test',
  queryInfos: {},
};

const CM_DATA_FIXTURE = {
  isCreatingEntry: true,
  createActionAllowedFields: ['test'],
  readActionAllowedFields: true,
  updateActionAllowedFields: ['test'],
  slug: 'slug',
  modifiedData: {
    id: 2,
  },
};

/**
 *
 * @param {Object} props
 * @param {string[] | undefined} initialEntries
 * @returns {Promise<import('@testing-library/react-hooks').RenderHookResult>}
 */
function setup(props, initialEntries) {
  return new Promise((resolve) => {
    act(() => {
      resolve(
        renderHook(() => useSelect(props), {
          wrapper: ({ children }) => (
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
          ),
        })
      );
    });
  });
}

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockReturnValue({
    isCreatingEntry: true,
    createActionAllowedFields: ['test'],
    readActionAllowedFields: true,
    updateActionAllowedFields: ['test'],
    slug: 'slug',
    modifiedData: {
      id: 2,
    },
  }),
}));

describe('RelationInputDataManager | select', () => {
  test('returns isCreatingEntry', async () => {
    const { result } = await setup(SELECT_ATTR_FIXTURE);

    expect(result.current.isCreatingEntry).toBe(true);
  });

  test('returns isFieldAllowed if isFieldAllowed is true', async () => {
    const { result } = await setup(SELECT_ATTR_FIXTURE);

    expect(result.current.isFieldAllowed).toBe(true);
  });

  test('returns isFieldAllowed if isFieldAllowed is false and user can create/ update field', async () => {
    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      isUserAllowedToEditField: false,
    });

    expect(result.current.isFieldAllowed).toBe(true);
  });

  test('returns false for isFieldAllowed if isFieldAllowed is false and user can not create', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      createActionAllowedFields: [],
    });

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      isUserAllowedToEditField: false,
    });

    expect(result.current.isFieldAllowed).toBe(false);
  });

  test('returns false for isFieldAllowed if isFieldAllowed is false and user can not update', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      isCreatingEntry: false,
      updateActionAllowedFields: [],
    });

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      isUserAllowedToEditField: false,
    });

    expect(result.current.isFieldAllowed).toBe(false);
  });

  test('returns true for isFieldReadable if user is allowed to read the field', async () => {
    const { result } = await setup(SELECT_ATTR_FIXTURE);

    expect(result.current.isFieldReadable).toBe(true);
  });

  test('returns false for isFieldReadable if user is not allowed to read the field', async () => {
    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      isUserAllowedToReadField: false,
    });

    expect(result.current.isFieldReadable).toBe(false);
  });

  test('returns false for isFieldReadable if user is not allowed to read the field', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      readActionAllowedFields: [],
    });

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      isUserAllowedToReadField: false,
    });

    expect(result.current.isFieldReadable).toBe(false);
  });

  test('returns empty fetch endpoint if the user is creating an entity', async () => {
    const { result } = await setup(SELECT_ATTR_FIXTURE);

    expect(result.current.queryInfos.endpoints.relation).toBe(null);
  });

  test('returns fetch endpoint if the user is editing an entity', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      isCreatingEntry: false,
    });

    const { result } = await setup(SELECT_ATTR_FIXTURE);

    expect(result.current.queryInfos.endpoints.relation).toBe(
      '/content-manager/relations/slug/2/test'
    );
  });

  test('returns the original queryInfos and queryInfos.endpoints', async () => {
    const FIXTURE_QUERY_INFOS = {
      test: true,
      endpoints: {
        search: '/content-manager/relations/slug/test',
      },
    };

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      queryInfos: FIXTURE_QUERY_INFOS,
    });

    expect(result.current.queryInfos).toStrictEqual({
      ...FIXTURE_QUERY_INFOS,
      endpoints: {
        ...FIXTURE_QUERY_INFOS.endpoints,
        relation: null,
      },
    });
  });

  test('splits the name properly, so that components are handled for endpoints', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      isCreatingEntry: false,
    });

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      name: 'someting.component-name.field-name',
    });

    expect(result.current.queryInfos).toStrictEqual({
      endpoints: {
        relation: '/content-manager/relations/slug/2/field-name',
        search: '/content-manager/relations/slug/field-name',
      },
    });
  });

  test('returns endpoints with component model and id in case of a relation in a single component', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      isCreatingEntry: false,
      modifiedData: {
        singleComp: {
          id: 1,
        },
      },
    });

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      name: 'singleComp.field-name',
      componentUid: 'basic.comp-relation',
    });

    expect(result.current.queryInfos).toStrictEqual({
      endpoints: {
        relation: '/content-manager/relations/basic.comp-relation/1/field-name',
        search: '/content-manager/relations/basic.comp-relation/field-name',
      },
    });
  });

  test('returns endpoints with component model and id in case of a relation in a rep or dz component', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      isCreatingEntry: false,
      modifiedData: {
        repComp: [
          {
            id: 1,
          },
        ],
      },
    });

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      name: 'repComp.0.field-name',
      componentUid: 'basic.comp-relation',
    });

    expect(result.current.queryInfos).toStrictEqual({
      endpoints: {
        relation: '/content-manager/relations/basic.comp-relation/1/field-name',
        search: '/content-manager/relations/basic.comp-relation/field-name',
      },
    });
  });

  test('returns a component ID', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      isCreatingEntry: false,
      modifiedData: {
        repComp: [
          {
            id: 1,
          },
        ],
      },
    });

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      name: 'repComp.0.field-name',
      componentUid: 'basic.comp-relation',
    });

    expect(result.current.componentId).toBe(1);
  });

  test('does not return a component ID if no component UID was passed', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      ...CM_DATA_FIXTURE,
      isCreatingEntry: false,
      modifiedData: {
        repComp: [
          {
            id: 1,
          },
        ],
      },
    });

    const { result } = await setup({
      ...SELECT_ATTR_FIXTURE,
      name: 'repComp.0.field-name',
      componentUid: null,
    });

    expect(result.current.componentId).toBeUndefined();
  });

  describe('Cloning entities', () => {
    it('should return isCloningEntry if on the cloning route', async () => {
      const { result } = await setup(
        {
          ...SELECT_ATTR_FIXTURE,
          isCloningEntity: true,
        },
        ['/content-manager/collectionType/test-content/create/clone/test-id']
      );

      expect(result.current.isCloningEntry).toBe(true);
    });

    it('should return the endpoint of the origin id if on the cloning route', async () => {
      const { result } = await setup(
        {
          ...SELECT_ATTR_FIXTURE,
          isCloningEntity: true,
        },
        ['/content-manager/collectionType/test-content/create/clone/test-id']
      );

      expect(result.current.queryInfos.endpoints.relation).toMatchInlineSnapshot(
        `"/content-manager/relations/slug/test-id/test"`
      );
    });
  });
});
