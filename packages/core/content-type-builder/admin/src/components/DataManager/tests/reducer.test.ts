import { actions, reducer, initialState } from '../reducer';

import type { AnyAttribute, ContentType, Component } from '../../../types';
import type { Internal, Schema } from '@strapi/types';

const testContentType: ContentType = {
  uid: 'api::test.test',
  attributes: [],
  modelType: 'contentType',
  kind: 'collectionType',
  info: {
    displayName: 'Test',
    singularName: 'test',
    pluralName: 'tests',
  },
  globalId: 'Test',
  modelName: 'test',
  status: 'UNCHANGED',
  visible: true,
  restrictRelationsTo: [],
};

const relatedContentType: ContentType = {
  uid: 'api::related.related',
  attributes: [],
  modelType: 'contentType',
  globalId: 'Related',
  modelName: 'related',
  status: 'UNCHANGED',
  kind: 'collectionType',
  info: {
    displayName: 'Related',
    singularName: 'related',
    pluralName: 'relateds',
  },
  visible: true,
  restrictRelationsTo: [],
};

describe('Content Type Builder | DataManager | reducer', () => {
  describe('init', () => {
    it('should initialize the state with components, content types, and reserved names', () => {
      const components = {
        'test:category.component': {
          uid: 'test:category.component' as Internal.UID.Component,
          attributes: [],
          category: 'test',
          modelType: 'component',
          globalId: 'TestComponent',
          info: {
            displayName: 'Test Component',
            icon: 'test',
          },
          modelName: 'test-component',
          status: 'NEW',
        } as Component,
      };

      const contentTypes = {
        'api::test.test': testContentType,
      };

      const reservedNames = {
        models: ['test'],
        attributes: ['id', 'createdAt'],
      };

      const action = actions.init({ components, contentTypes, reservedNames });
      const state = reducer(undefined, action);

      expect(state.current).toEqual({
        ...initialState,
        components,
        initialComponents: components,
        contentTypes,
        initialContentTypes: contentTypes,
        reservedNames,
        isLoading: false,
      });
    });
  });

  describe('createComponentSchema', () => {
    it('should add a new component schema to the state', () => {
      const action = actions.createComponentSchema({
        uid: 'test:category.component',
        componentCategory: 'test',
        data: {
          icon: 'test',
          displayName: 'Test Component',
        },
      });

      const state = reducer(undefined, action);

      expect(state.current.components['test:category.component']).toBeDefined();
      expect(state.current.components['test:category.component']).toMatchObject({
        uid: 'test:category.component',
        category: 'test',
        status: 'NEW',
        info: {
          icon: 'test',
          displayName: 'Test Component',
        },
        attributes: [],
      });
    });
  });

  describe('createSchema', () => {
    it('should add a new content type schema to the state', () => {
      const action = actions.createSchema({
        uid: 'api::test.test',
        data: {
          displayName: 'Test',
          singularName: 'test',
          pluralName: 'tests',
          kind: 'collectionType',
          draftAndPublish: true,
          pluginOptions: {},
        },
      });

      const state = reducer(undefined, action);

      expect(state.current.contentTypes['api::test.test']).toBeDefined();
      expect(state.current.contentTypes['api::test.test']).toMatchObject({
        uid: 'api::test.test',
        status: 'NEW',
        kind: 'collectionType',
        info: {
          displayName: 'Test',
          singularName: 'test',
          pluralName: 'tests',
        },
        attributes: [],
        options: {
          draftAndPublish: true,
        },
      });
    });
  });

  describe('moveAttribute', () => {
    it('should reorder attributes in a content type', () => {
      // Initialize state with a content type with attributes
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              attributes: [
                { name: 'title', type: 'string' },
                { name: 'description', type: 'text' },
                { name: 'date', type: 'date' },
              ],
            },
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Move an attribute
      const action = actions.moveAttribute({
        forTarget: 'contentType',
        targetUid: 'api::test.test',
        from: 0,
        to: 2,
      });

      const state = reducer(initializedState, action);

      // Check the attributes order
      expect(state.current.contentTypes['api::test.test'].attributes[0].name).toBe('description');
      expect(state.current.contentTypes['api::test.test'].attributes[1].name).toBe('date');
      expect(state.current.contentTypes['api::test.test'].attributes[2].name).toBe('title');
      expect(state.current.contentTypes['api::test.test'].status).toBe('CHANGED');
    });
  });

  describe('removeField', () => {
    it('should remove an attribute from a content type', () => {
      // Initialize state with a content type with attributes
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              attributes: [
                { name: 'title', type: 'string', status: 'CHANGED' },
                { name: 'description', type: 'text', status: 'CHANGED' },
              ],
            },
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Remove an attribute
      const action = actions.removeField({
        forTarget: 'contentType',
        targetUid: 'api::test.test',
        attributeToRemoveName: 'title',
      });

      const state = reducer(initializedState, action);

      // Check that the attribute was marked as removed but still exists
      expect(state.current.contentTypes['api::test.test'].attributes).toHaveLength(2);
      expect(state.current.contentTypes['api::test.test'].attributes[0].status).toBe('REMOVED');
      expect(state.current.contentTypes['api::test.test'].status).toBe('CHANGED');
    });

    it('should remove a NEW attribute completely', () => {
      // Initialize state with a content type with attributes
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              attributes: [
                ...testContentType.attributes,
                { name: 'title', type: 'string', status: 'NEW' },
                { name: 'description', type: 'text', status: 'CHANGED' },
              ],
              modelType: 'contentType',
            },
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Remove a NEW attribute
      const action = actions.removeField({
        forTarget: 'contentType',
        targetUid: 'api::test.test',
        attributeToRemoveName: 'title',
      });

      const state = reducer(initializedState, action);

      // Check that the attribute was completely removed
      expect(state.current.contentTypes['api::test.test'].attributes).toHaveLength(1);
      expect(state.current.contentTypes['api::test.test'].attributes[0].name).toBe('description');
      expect(state.current.contentTypes['api::test.test'].status).toBe('CHANGED');
    });
  });

  describe('undo/redo functionality', () => {
    it('should allow undoing and redoing actions', () => {
      // Initialize state
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': testContentType,
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Add an attribute
      const afterAdd = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: { name: 'title', type: 'string' },
          forTarget: 'contentType',
          targetUid: 'api::test.test',
        })
      );

      // Verify attribute was added
      expect(afterAdd.current.contentTypes['api::test.test'].attributes).toHaveLength(1);

      // Undo the add action
      const afterUndo = reducer(afterAdd, { type: 'data-manager/undo' });

      // Verify attribute was removed by undo
      expect(afterUndo.current.contentTypes['api::test.test'].attributes).toHaveLength(0);

      // Redo the add action
      const afterRedo = reducer(afterUndo, { type: 'data-manager/redo' });

      // Verify attribute was added back by redo
      expect(afterRedo.current.contentTypes['api::test.test'].attributes).toHaveLength(1);
    });
  });

  describe('addCustomFieldAttribute', () => {
    it('should add a custom field attribute to a content type', () => {
      // Initialize state with a content type
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': testContentType,
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Add a custom field attribute
      const action = actions.addCustomFieldAttribute({
        attributeToSet: {
          name: 'customField',
          type: 'customField',
          customField: 'test.custom-field',
        },
        forTarget: 'contentType',
        targetUid: 'api::test.test',
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes['api::test.test'].attributes).toHaveLength(1);
      expect(state.current.contentTypes['api::test.test'].attributes[0]).toMatchObject({
        name: 'customField',
        type: 'customField',
        customField: 'test.custom-field',
        status: 'NEW',
      });
      expect(state.current.contentTypes['api::test.test'].status).toBe('CHANGED');
    });
  });

  describe('addCreatedComponentToDynamicZone', () => {
    it('should add components to a dynamic zone', () => {
      // Initialize state with a content type that has a dynamic zone
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              attributes: [
                {
                  name: 'dz',
                  type: 'dynamiczone',
                  components: ['test.comp1'],
                },
              ],
            },
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Add components to the dynamic zone
      const action = actions.addCreatedComponentToDynamicZone({
        dynamicZoneTarget: 'dz',
        componentsToAdd: ['test.comp2', 'test.comp3'],
        forTarget: 'contentType',
        targetUid: 'api::test.test',
      });

      const state = reducer(initializedState, action);

      expect(
        (state.current.contentTypes['api::test.test'].attributes[0] as Schema.Attribute.DynamicZone)
          .components
      ).toEqual(['test.comp1', 'test.comp2', 'test.comp3']);
      expect(state.current.contentTypes['api::test.test'].attributes[0].status).toBe('CHANGED');
      expect(state.current.contentTypes['api::test.test'].status).toBe('CHANGED');
    });
  });

  describe('changeDynamicZoneComponents', () => {
    it('should change components in a dynamic zone and ensure uniqueness', () => {
      // Initialize state with a content type that has a dynamic zone
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              attributes: [
                ...testContentType.attributes,
                {
                  name: 'dz',
                  type: 'dynamiczone',
                  components: ['test.comp1', 'test.comp2'],
                } as AnyAttribute,
              ],
            },
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Change dynamic zone components
      const action = actions.changeDynamicZoneComponents({
        dynamicZoneTarget: 'dz',
        newComponents: ['test.comp2', 'test.comp3'],
        forTarget: 'contentType',
        targetUid: 'api::test.test',
      });

      const state = reducer(initializedState, action);

      // Should include all components with no duplicates
      expect(
        (state.current.contentTypes['api::test.test'].attributes[0] as Schema.Attribute.DynamicZone)
          .components
      ).toEqual(['test.comp1', 'test.comp2', 'test.comp3']);
      expect(state.current.contentTypes['api::test.test'].status).toBe('CHANGED');
      expect(state.current.contentTypes['api::test.test'].attributes[0].status).toBe('CHANGED');
    });
  });

  describe('editAttribute', () => {
    it('should edit a non-relation attribute', () => {
      // Initialize state with a content type that has attributes
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              attributes: [
                ...testContentType.attributes,
                { name: 'title', type: 'string', required: false },
              ],
            },
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Edit the attribute
      const action = actions.editAttribute({
        attributeToSet: {
          name: 'title',
          type: 'string',
          required: true,
          unique: true,
        },
        forTarget: 'contentType',
        targetUid: 'api::test.test',
        name: 'title',
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes['api::test.test'].attributes[0]).toMatchObject({
        name: 'title',
        type: 'string',
        required: true,
        unique: true,
        status: 'CHANGED',
      });
      expect(state.current.contentTypes['api::test.test'].status).toBe('CHANGED');
    });

    it('should handle relation attribute changes', () => {
      // Initialize state with two content types and a relation attribute
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              attributes: [
                {
                  name: 'relation',
                  type: 'relation',
                  relation: 'oneToOne',
                  target: 'api::related.related',
                },
              ],
            },
            'api::related.related': relatedContentType,
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Edit the relation attribute
      const action = actions.editAttribute({
        attributeToSet: {
          name: 'relation',
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::related.related',
        },
        forTarget: 'contentType',
        targetUid: 'api::test.test',
        name: 'relation',
      });

      const state = reducer(initializedState, action);

      // Check the relation attribute was updated
      expect(state.current.contentTypes['api::test.test'].attributes[0]).toMatchObject({
        name: 'relation',
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::related.related',
        status: 'CHANGED',
      });
    });
  });

  describe('removeComponentFromDynamicZone', () => {
    it('should remove a component from a dynamic zone', () => {
      // Initialize state with a content type that has a dynamic zone
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': {
              uid: 'api::test.test' as Internal.UID.ContentType,
              attributes: [
                {
                  name: 'dz',
                  type: 'dynamiczone',
                  components: ['test.comp1', 'test.comp2', 'test.comp3'],
                } as AnyAttribute,
              ],
              modelType: 'contentType',
            } as ContentType,
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Remove component from dynamic zone
      const action = actions.removeComponentFromDynamicZone({
        dzName: 'dz',
        componentToRemoveIndex: 1,
        forTarget: 'contentType',
        targetUid: 'api::test.test',
      });

      const state = reducer(initializedState, action);

      expect(
        (state.current.contentTypes['api::test.test'].attributes[0] as Schema.Attribute.DynamicZone)
          .components
      ).toEqual(['test.comp1', 'test.comp3']);
      expect(state.current.contentTypes['api::test.test'].status).toBe('CHANGED');
      expect(state.current.contentTypes['api::test.test'].attributes[0].status).toBe('CHANGED');
    });
  });

  describe('updateComponentSchema', () => {
    it('should update a component schema', () => {
      // Initialize state with a component
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {
            'test:category.component': {
              uid: 'test:category.component' as Internal.UID.Component,
              attributes: [],
              category: 'test',
              modelType: 'component',
              info: {
                displayName: 'Old Name',
                icon: 'old-icon',
              },
              globalId: 'TestComponent',
              modelName: 'test-component',
              status: 'UNCHANGED',
            } as Component,
          },
          contentTypes: {},
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Update component schema
      const action = actions.updateComponentSchema({
        data: {
          displayName: 'New Name',
          icon: 'new-icon',
        },
        uid: 'test:category.component',
      });

      const state = reducer(initializedState, action);

      expect(state.current.components['test:category.component'].info).toEqual({
        displayName: 'New Name',
        icon: 'new-icon',
      });
      expect(state.current.components['test:category.component'].status).toBe('CHANGED');
    });
  });

  describe('updateSchema', () => {
    it('should update a content type schema', () => {
      // Initialize state with a content type
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': testContentType,
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Update schema
      const action = actions.updateSchema({
        data: {
          displayName: 'New Name',
          kind: 'singleType',
          draftAndPublish: true,
          pluginOptions: { i18n: { localized: true } },
        },
        uid: 'api::test.test',
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes['api::test.test']).toMatchObject({
        info: {
          displayName: 'New Name',
        },
        kind: 'singleType',
        options: {
          draftAndPublish: true,
        },
        pluginOptions: { i18n: { localized: true } },
        status: 'CHANGED',
      });
    });
  });

  describe('deleteComponent', () => {
    it('should delete a component and remove references to it', () => {
      // Initialize state with components and content types that reference it
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {
            'test.component1': {
              uid: 'test.component1',
              attributes: [
                {
                  name: 'comp2',
                  type: 'component',
                  component: 'test.component2',
                },
              ],
              category: 'test',
              modelType: 'component',
              globalId: 'TestComponent1',
              modelName: 'test-component',
              info: {
                displayName: 'Test Component 1',
              },
              status: 'UNCHANGED',
            },
            'test.component2': {
              uid: 'test.component2',
              attributes: [],
              category: 'test',
              modelType: 'component',
              globalId: 'TestComponent2',
              modelName: 'test-component',
              info: {
                displayName: 'Test Component 2',
              },
              status: 'UNCHANGED',
            },
          },
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              attributes: [
                {
                  name: 'comp',
                  type: 'component',
                  component: 'test.component2',
                },
                {
                  name: 'dz',
                  type: 'dynamiczone',
                  components: ['test.component1', 'test.component2'],
                },
              ],
            },
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Delete component
      const action = actions.deleteComponent('test.component2');

      const state = reducer(initializedState, action);

      // Component should be marked as removed
      expect(state.current.components['test.component2'].status).toBe('REMOVED');

      // References to the component should be marked as removed or updated
      expect(state.current.components['test.component1'].attributes[0].status).toBe('REMOVED');
      expect(state.current.contentTypes['api::test.test'].attributes[0].status).toBe('REMOVED');

      // Dynamic zone should have the component removed
      expect(
        (state.current.contentTypes['api::test.test'].attributes[1] as Schema.Attribute.DynamicZone)
          .components
      ).not.toContain('test:category.component2');
    });
  });

  describe('deleteContentType', () => {
    it('should delete a content type and remove relations to it', () => {
      // Initialize state with content types that reference each other
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {
            'test:category.component': {
              uid: 'test.component',
              attributes: [
                {
                  name: 'relation',
                  type: 'relation',
                  relation: 'oneToOne',
                  target: 'api::test.test',
                },
              ],
              category: 'test',
              modelType: 'component',
              info: {
                displayName: 'Test Component',
              },
              globalId: 'TestComponent',
              modelName: 'test-component',
              status: 'NEW',
            },
          },
          contentTypes: {
            'api::test.test': {
              ...testContentType,
              status: 'CHANGED',
            },
            'api::related.related': {
              ...relatedContentType,
              attributes: [
                ...relatedContentType.attributes,
                {
                  name: 'relation',
                  type: 'relation',
                  relation: 'oneToOne',
                  target: 'api::test.test',
                } as AnyAttribute,
              ],
              modelType: 'contentType',
            },
            'api::new.new': {
              uid: 'api::new.new',
              attributes: [],
              modelType: 'contentType',
              status: 'NEW',
              globalId: 'New',
              modelName: 'new',
              kind: 'collectionType',
              info: {
                displayName: 'New',
                singularName: 'new',
                pluralName: 'news',
              },
              visible: true,
              restrictRelationsTo: [],
            },
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Delete content type with status CHANGED
      const action1 = actions.deleteContentType('api::test.test' as Internal.UID.ContentType);
      const state1 = reducer(initializedState, action1);

      // Content type should be marked as REMOVED
      expect(state1.current.contentTypes['api::test.test'].status).toBe('REMOVED');

      // Relations to it should be removed
      expect(state1.current.contentTypes['api::related.related'].attributes[0].status).toBe(
        'REMOVED'
      );
      expect(state1.current.components['test:category.component'].attributes[0].status).toBe(
        'REMOVED'
      );

      // Delete content type with status NEW
      const action2 = actions.deleteContentType('api::new.new' as Internal.UID.ContentType);
      const state2 = reducer(state1, action2);

      // Content type should be completely removed
      expect(state2.current.contentTypes['api::new.new']).toBeUndefined();
    });
  });

  describe('applyChange', () => {
    it('should apply a schema addition', () => {
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {},
          reservedNames: { models: [], attributes: [] },
        })
      );

      // Apply change to add a component
      const action = actions.applyChange({
        action: 'add',
        schema: {
          uid: 'test.component',
          modelType: 'component',
          category: 'test',
          info: {
            displayName: 'Test Component',
          },
          attributes: [],
          globalId: 'TestComponent',
          modelName: 'test-component',
          status: 'NEW',
        },
      });

      const state = reducer(initializedState, action);
      expect(state.current.components['test.component']).toBeDefined();
      expect(state.current.components['test.component'].status).toBe('NEW');
    });
  });

  describe('history management', () => {
    it('should limit history to configured amount', () => {
      // Initialize state
      const initializedState = reducer(
        undefined,
        actions.init({
          components: {},
          contentTypes: {
            'api::test.test': testContentType,
          },
          reservedNames: { models: [], attributes: [] },
        })
      );

      let state = initializedState;

      // Create 100 actions to test history limit
      for (let i = 0; i < 100; i++) {
        state = reducer(
          state,
          actions.addAttribute({
            attributeToSet: { name: `attr${i}`, type: 'string' },
            forTarget: 'contentType',
            targetUid: 'api::test.test',
          })
        );
      }

      // History should be limited to 50 items (default limit)
      expect(state.past.length).toBeLessThanOrEqual(50);
    });
  });
});
