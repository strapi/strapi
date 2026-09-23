import { reducer, actions, type State } from '../reducer';

import { initCT, initCompo, init as initUtils } from './utils';

import type { Struct } from '@strapi/types';

const baseContentType = initCT('test', {});
const relatedContentType = initCT('relationship', {});
const baseComponent = initCompo('test', {});
type AddAttributePayload = Parameters<typeof actions.addAttribute>[0];

const SEARCHABLE_SCALAR_TYPES = [
  'string',
  'text',
  'uid',
  'email',
  'enumeration',
  'richtext',
  'biginteger',
  'integer',
  'decimal',
  'float',
] as const;

const NON_SEARCHABLE_PRIVATE_ATTRIBUTES = [
  { type: 'password' },
  { type: 'boolean' },
  { type: 'blocks' },
  { type: 'json' },
  { type: 'date' },
  { type: 'time' },
  { type: 'datetime' },
  { type: 'timestamp' },
  { type: 'media', multiple: false },
  { type: 'component', component: 'default.test', repeatable: false },
  { type: 'dynamiczone', components: ['default.test'] },
  {
    type: 'relation',
    relation: 'oneWay',
    target: 'api::relationship.relationship',
  },
] as const;

const init = () => {
  return initUtils({
    components: {
      'default.test': baseComponent,
    },
    contentTypes: {
      'api::test.test': baseContentType,
      'api::relationship.relationship': relatedContentType,
    },
    reservedNames: { models: [], attributes: [] },
  });
};

const getType = (
  state: State,
  {
    forTarget,
    targetUid,
  }: {
    forTarget: Struct.ModelType;
    targetUid: string;
  }
) => {
  return state.current[forTarget === 'contentType' ? 'contentTypes' : 'components'][targetUid];
};

describe.each<{ forTarget: Struct.ModelType; targetUid: string }>([
  {
    forTarget: 'contentType',
    targetUid: 'api::test.test',
  },
  {
    forTarget: 'component',
    targetUid: 'default.test',
  },
])('DataManager | reducer (%s)', ({ forTarget, targetUid }) => {
  describe('Adding a scalar attribute', () => {
    it.each([
      ['string', { required: true }],
      ['text', { private: true }],
      ['integer', {}],
      ['decimal', {}],
      ['float', {}],
      ['biginteger', {}],
      ['email', {}],
      ['password', {}],
      ['uid', {}],
      ['enumeration', {}],
      ['time', {}],
      ['date', {}],
      ['datetime', {}],
      ['timestamp', {}],
      ['json', {}],
      // should not be able to highjack the status
      ['string', { status: 'REMOVED' }],
    ] as const)('Should add a %s field to a type correctly', (type, opts) => {
      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: { type, name: 'name', ...opts } as AddAttributePayload['attributeToSet'],
          forTarget,
          targetUid,
        })
      );

      expect(
        getType(state, {
          forTarget,
          targetUid,
        })
      ).toMatchObject({
        status: 'CHANGED',
        attributes: [{ name: 'name', type, ...opts, status: 'NEW' }],
      });
    });

    it.each(SEARCHABLE_SCALAR_TYPES)(
      'marks a new private %s attribute as not searchable by default',
      (type) => {
        const initializedState = init();

        const state = reducer(
          initializedState,
          actions.addAttribute({
            attributeToSet: {
              type,
              name: 'secret',
              private: true,
            } as AddAttributePayload['attributeToSet'],
            forTarget,
            targetUid,
          })
        );

        expect(getType(state, { forTarget, targetUid })).toMatchObject({
          attributes: [
            {
              name: 'secret',
              type,
              private: true,
              searchable: false,
              status: 'NEW',
            },
          ],
        });
      }
    );

    it.each(NON_SEARCHABLE_PRIVATE_ATTRIBUTES)(
      'does not add searchable to a new private $type attribute',
      (properties) => {
        const initializedState = init();
        const attributeToSet = {
          ...properties,
          name: 'secret',
          private: true,
        } as AddAttributePayload['attributeToSet'];

        const state = reducer(
          initializedState,
          actions.addAttribute({ attributeToSet, forTarget, targetUid })
        );

        const [attribute] = getType(state, { forTarget, targetUid }).attributes;

        expect(attribute).toEqual({ ...attributeToSet, status: 'NEW' });
        expect(attribute).not.toHaveProperty('searchable');
      }
    );

    it.each([true, false])(
      'preserves searchable: %s for a new private scalar attribute',
      (searchable) => {
        const initializedState = init();

        const state = reducer(
          initializedState,
          actions.addAttribute({
            attributeToSet: { type: 'text', name: 'secret', private: true, searchable },
            forTarget,
            targetUid,
          })
        );

        expect(getType(state, { forTarget, targetUid })).toMatchObject({
          attributes: [
            {
              name: 'secret',
              type: 'text',
              private: true,
              searchable,
              status: 'NEW',
            },
          ],
        });
      }
    );

    it('does not add searchable to a new non-private scalar attribute', () => {
      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: { type: 'text', name: 'title' },
          forTarget,
          targetUid,
        })
      );

      const [attribute] = getType(state, { forTarget, targetUid }).attributes;

      expect(attribute).toEqual({ name: 'title', type: 'text', status: 'NEW' });
      expect(attribute).not.toHaveProperty('searchable');
    });
  });

  it('Should throw id content type does not exist', () => {
    const initializedState = init();

    const makeAction = () =>
      reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: { type: 'string', name: 'name' },
          forTarget,
          targetUid: 'api::unknown.unknown',
        })
      );

    expect(makeAction).toThrow();
  });

  it('Should add a media field to a type correctly', () => {
    const initializedState = init();

    const state = reducer(
      initializedState,
      actions.addAttribute({
        attributeToSet: { type: 'media', name: 'cover', multiple: false },
        forTarget,
        targetUid,
      })
    );

    expect(
      getType(state, {
        forTarget,
        targetUid,
      })
    ).toMatchObject({
      status: 'CHANGED',
      attributes: [{ name: 'cover', type: 'media', multiple: false, status: 'NEW' }],
    });
  });

  //relation
  describe('Adding a relation', () => {
    it('Should add a oneToOne relation without targetAttribute to a type correctly', () => {
      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: {
            type: 'relation',
            name: 'related',
            relation: 'oneToOne',
            target: 'api::relationship.relationship',
          },
          forTarget,
          targetUid,
        })
      );

      expect(
        getType(state, {
          forTarget,
          targetUid,
        })
      ).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'related',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::relationship.relationship',
            status: 'NEW',
          },
        ],
      });
    });

    it('Should add a oneToOne relation with targetAttribute to a type correctly', () => {
      if (forTarget === 'component') {
        return;
      }

      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: {
            type: 'relation',
            name: 'relatedItem',
            relation: 'oneToOne',
            target: 'api::relationship.relationship',
            targetAttribute: 'testItem',
          },
          forTarget,
          targetUid,
        })
      );

      expect(
        getType(state, {
          forTarget,
          targetUid,
        })
      ).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'relatedItem',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::relationship.relationship',
            targetAttribute: 'testItem',
            status: 'NEW',
          },
        ],
      });

      expect(state.current.contentTypes['api::relationship.relationship']).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'testItem',
            type: 'relation',
            relation: 'oneToOne',
            target: targetUid,
            targetAttribute: 'relatedItem',
            status: 'NEW',
          },
        ],
      });
    });

    it('Should add a oneToMany relation without targetAttribute to a type correctly', () => {
      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: {
            type: 'relation',
            name: 'relatedItems',
            relation: 'oneToMany',
            target: 'api::relationship.relationship',
          },
          forTarget,
          targetUid,
        })
      );

      expect(
        getType(state, {
          forTarget,
          targetUid,
        })
      ).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'relatedItems',
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::relationship.relationship',
            status: 'NEW',
          },
        ],
      });
    });

    it('Should add a oneToMany relation with targetAttribute to a type correctly', () => {
      if (forTarget === 'component') {
        return;
      }

      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: {
            type: 'relation',
            name: 'relatedItems',
            relation: 'oneToMany',
            target: 'api::relationship.relationship',
            targetAttribute: 'testItem',
          },
          forTarget,
          targetUid,
        })
      );

      expect(
        getType(state, {
          forTarget,
          targetUid,
        })
      ).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'relatedItems',
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::relationship.relationship',
            targetAttribute: 'testItem',
            status: 'NEW',
          },
        ],
      });

      expect(state.current.contentTypes['api::relationship.relationship']).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'testItem',
            type: 'relation',
            relation: 'manyToOne',
            target: targetUid,
            targetAttribute: 'relatedItems',
            status: 'NEW',
          },
        ],
      });
    });

    it('Should add a manyToOne relation to a type correctly', () => {
      if (forTarget === 'component') {
        return;
      }

      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: {
            type: 'relation',
            name: 'related',
            relation: 'manyToOne',
            target: 'api::relationship.relationship',
            targetAttribute: 'testItems',
          },
          forTarget,
          targetUid,
        })
      );

      expect(
        getType(state, {
          forTarget,
          targetUid,
        })
      ).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'related',
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::relationship.relationship',
            targetAttribute: 'testItems',
            status: 'NEW',
          },
        ],
      });

      expect(state.current.contentTypes['api::relationship.relationship']).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'testItems',
            type: 'relation',
            relation: 'oneToMany',
            target: targetUid,
            targetAttribute: 'related',
            status: 'NEW',
          },
        ],
      });
    });

    it('Should add a manyToMany relation to a type correctly', () => {
      if (forTarget === 'component') {
        return;
      }

      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: {
            type: 'relation',
            name: 'relatedItems',
            relation: 'manyToMany',
            target: 'api::relationship.relationship',
            targetAttribute: 'testItems',
          },
          forTarget,
          targetUid,
        })
      );

      const type = getType(state, {
        forTarget,
        targetUid,
      });

      expect(type).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'relatedItems',
            type: 'relation',
            relation: 'manyToMany',
            target: 'api::relationship.relationship',
            targetAttribute: 'testItems',
            status: 'NEW',
          },
        ],
      });

      expect(state.current.contentTypes['api::relationship.relationship']).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'testItems',
            type: 'relation',
            relation: 'manyToMany',
            target: targetUid,
            targetAttribute: 'relatedItems',
            status: 'NEW',
          },
        ],
      });
    });
  });

  //component
  // repeatable / not repeatable
  // min/max
  // required / not required
  describe('Adding a component field attribute', () => {
    it('Should add a component field to a type correctly', () => {
      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: {
            type: 'component',
            name: 'compo',
            component: 'default.test',
          },
          forTarget,
          targetUid,
        })
      );

      const type = getType(state, {
        forTarget,
        targetUid,
      });

      expect(type).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'compo',
            type: 'component',
            component: 'default.test',
            status: 'NEW',
          },
        ],
      });
    });
  });

  // dynamic zone
  describe('Adding a dynamic zone', () => {
    it('Should add a dynamic zone field to a type correctly', () => {
      const initializedState = init();

      const state = reducer(
        initializedState,
        actions.addAttribute({
          attributeToSet: {
            type: 'dynamiczone',
            name: 'zones',
            components: ['default.test'],
          },
          forTarget,
          targetUid,
        })
      );

      const type = getType(state, {
        forTarget,
        targetUid,
      });

      expect(type).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'zones',
            type: 'dynamiczone',
            components: ['default.test'],
            status: 'NEW',
          },
        ],
      });
    });
  });
});
