import { fromJS, List, Map, OrderedMap } from 'immutable';

import {
  addAttributeRelation,
  addAttributeToExistingContentType,
  addAttributeToTempContentType,
  cancelNewContentType,
  clearTemporaryAttribute,
  clearTemporaryAttributeRelation,
  createTempContentType,
  deleteModelAttribute,
  deleteModelSucceeded,
  deleteTemporaryModel,
  getDataSucceeded,
  onChangeExistingContentTypeMainInfos,
  onChangeNewContentTypeMainInfos,
  onChangeAttribute,
  resetNewContentTypeMainInfos,
  resetEditExistingContentType,
  resetEditTempContentType,
  resetProps,
  saveEditedAttribute,
  setTemporaryAttribute,
  submitTempContentTypeSucceeded,
  updateTempContentType,
  resetExistingContentTypeMainInfos,
  onChangeRelation,
  onChangeRelationNature,
  onChangeRelationTarget,
} from '../actions';
import appReducer, { shouldPluralizeKey, shouldPluralizeName } from '../reducer';

describe('Reducer utils', () => {
  describe('ShouldPluralizeKey', () => {
    it('should return true for the manyToMany & manyToOne relations', () => {
      expect(shouldPluralizeKey('manyToMany')).toBeTruthy();
      expect(shouldPluralizeKey('manyToOne')).toBeTruthy();
    });

    it('should return false otherwise', () => {
      expect(shouldPluralizeKey('oneWay')).toBeFalsy();
      expect(shouldPluralizeKey('oneToMay')).toBeFalsy();
    });
  });

  describe('ShouldPluralizeName', () => {
    it('should return true for the manyToMany & oneToMany relations', () => {
      expect(shouldPluralizeName('manyToMany')).toBeTruthy();
      expect(shouldPluralizeName('oneToMany')).toBeTruthy();
    });

    it('should return false otherwise', () => {
      expect(shouldPluralizeName('oneWay')).toBeFalsy();
      expect(shouldPluralizeName('manyToOne')).toBeFalsy();
    });
  });
});

describe('appReducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      connections: List(['default']),
      initialData: {
        product: {
          name: 'product',
          collectionName: 'product',
          connection: 'default',
          description: 'super api',
          mainField: '',
          attributes: {
            name: { type: 'string' },
          },
        },
      },
      isLoading: true,
      models: List([
        {
          icon: 'fa-cube',
          name: 'product',
          description: '',
          fields: 1,
          isTemporary: false,
        },
      ]),
      modifiedData: {
        product: {
          name: 'product',
          collectionName: 'product',
          connection: 'default',
          description: 'super api',
          mainField: '',
          attributes: {
            name: { type: 'string' },
          },
        },
      },
      newContentType: {
        collectionName: '',
        connection: '',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      newContentTypeClone: {
        collectionName: '',
        connection: '',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      temporaryAttribute: {},
      initialTemporaryAttributeRelation: {
        name: '',
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: '',
        unique: false,
      },
      temporaryAttributeRelation: {
        name: '',
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: '',
        unique: false,
      },
    });
  });

  it('returns the initial state', () => {
    const expected = state
      .set('modifiedData', Map({}))
      .set('initialData', Map({}))
      .set('connections', List([]))
      .set('models', List([]));

    expect(appReducer(undefined, {})).toEqual(expected);
  });

  it('should handle the addAttributeRelation action correctly if the target is different than the current model (temporaryModel)', () => {
    state = state
      .setIn(['temporaryAttributeRelation', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'target'], 'test1');

    const expected = state.setIn(
      ['modifiedData', 'product', 'attributes', 'test'],
      Map({
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: 'test1',
        unique: false,
      }),
    );

    expect(appReducer(state, addAttributeRelation(false, 'product'))).toEqual(expected);
  });

  it('should handle the addAttributeRelation action correctly if the target is different than the current model ', () => {
    state = state
      .setIn(['newContentType', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'target'], 'test1');

    const expected = state.setIn(
      ['newContentType', 'attributes', 'test'],
      Map({
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: 'test1',
        unique: false,
      }),
    );

    expect(appReducer(state, addAttributeRelation(true, null))).toEqual(expected);
  });

  it('should handle the addAttributeRelation action correctly if the target is equal the current model and the relation is oneWay', () => {
    state = state
      .setIn(['newContentType', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'target'], 'test1');

    const expected = state.setIn(
      ['newContentType', 'attributes', 'test'],
      Map({
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: 'test1',
        unique: false,
      }),
    );

    expect(appReducer(state, addAttributeRelation(true, null))).toEqual(expected);
  });

  it('should handle the addAttributeRelation action correctly if the target is equal the current model and the relation is manyToMany', () => {
    state = state
      .setIn(['newContentType', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'name'], 'strapi')
      .setIn(['temporaryAttributeRelation', 'key'], 'notstrapi')
      .setIn(['temporaryAttributeRelation', 'target'], 'test')
      .setIn(['temporaryAttributeRelation', 'nature'], 'manyToMany')
      .setIn(['temporaryAttributeRelation', 'dominant'], true);

    const expected = state
      .setIn(
        ['newContentType', 'attributes', 'strapi'],
        Map({
          dominant: true,
          columnName: '',
          targetColumnName: '',
          key: 'notstrapi',
          nature: 'manyToMany',
          plugin: '',
          target: 'test',
          unique: false,
        }),
      )
      .setIn(
        ['newContentType', 'attributes', 'notstrapi'],
        Map({
          dominant: false,
          columnName: '',
          targetColumnName: '',
          key: 'strapi',
          nature: 'manyToMany',
          plugin: '',
          target: 'test',
          unique: false,
        }),
      );

    expect(appReducer(state, addAttributeRelation(true, 'test'))).toEqual(expected);
  });

  it('should handle the addAttributeRelation action correctly if the target is equal the current model and the relation is manyToOne', () => {
    state = state
      .setIn(['newContentType', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'name'], 'strapi')
      .setIn(['temporaryAttributeRelation', 'key'], 'notstrapi')
      .setIn(['temporaryAttributeRelation', 'target'], 'test')
      .setIn(['temporaryAttributeRelation', 'nature'], 'manyToOne')
      .setIn(['temporaryAttributeRelation', 'dominant'], true);

    const expected = state
      .setIn(
        ['newContentType', 'attributes', 'strapi'],
        Map({
          dominant: true,
          columnName: '',
          targetColumnName: '',
          key: 'notstrapi',
          nature: 'manyToOne',
          plugin: '',
          target: 'test',
          unique: false,
        }),
      )
      .setIn(
        ['newContentType', 'attributes', 'notstrapi'],
        Map({
          dominant: false,
          columnName: '',
          targetColumnName: '',
          key: 'strapi',
          nature: 'oneToMany',
          plugin: '',
          target: 'test',
          unique: false,
        }),
      );

    expect(appReducer(state, addAttributeRelation(true, 'test'))).toEqual(expected);
  });

  it('should handle the addAttributeRelation action correctly if the target is equal the current model and the relation is oneToMany', () => {
    state = state
      .setIn(['newContentType', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'name'], 'strapi')
      .setIn(['temporaryAttributeRelation', 'key'], 'notstrapi')
      .setIn(['temporaryAttributeRelation', 'target'], 'test')
      .setIn(['temporaryAttributeRelation', 'nature'], 'oneToMany')
      .setIn(['temporaryAttributeRelation', 'dominant'], true);

    const expected = state
      .setIn(
        ['newContentType', 'attributes', 'strapi'],
        Map({
          dominant: true,
          columnName: '',
          targetColumnName: '',
          key: 'notstrapi',
          nature: 'oneToMany',
          plugin: '',
          target: 'test',
          unique: false,
        }),
      )
      .setIn(
        ['newContentType', 'attributes', 'notstrapi'],
        Map({
          dominant: false,
          columnName: '',
          targetColumnName: '',
          key: 'strapi',
          nature: 'manyToOne',
          plugin: '',
          target: 'test',
          unique: false,
        }),
      );

    expect(appReducer(state, addAttributeRelation(true, 'test'))).toEqual(expected);
  });

  it('should handle the addAttributeToExistingContentType action correctly if the type is different than number', () => {
    state = state
      .setIn(['temporaryAttribute', 'name'], 'test')
      .setIn(['temporaryAttribute', 'type'], 'string');

    const expected = state
      .setIn(['modifiedData', 'product', 'attributes', 'test', 'type'], 'string')
      .set('temporaryAttribute', Map({}));

    expect(appReducer(state, addAttributeToExistingContentType('product', 'string'))).toEqual(expected);
  });

  it('should handle the addAttributeToExistingContentType action correctly if the type is number', () => {
    state = state
      .setIn(['temporaryAttribute', 'name'], 'test')
      .setIn(['temporaryAttribute', 'type'], 'float');

    const expected = state
      .setIn(['modifiedData', 'product', 'attributes', 'test', 'type'], 'float')
      .set('temporaryAttribute', Map({}));

    expect(appReducer(state, addAttributeToExistingContentType('product', 'number'))).toEqual(expected);
  });

  it('should handle the addAttributeToTempContentType action correctly if the type is different than number', () => {
    state = state
      .setIn(['temporaryAttribute', 'name'], 'test')
      .setIn(['temporaryAttribute', 'type'], 'string');

    const expected = state
      .setIn(['newContentType', 'attributes', 'test', 'type'], 'string')
      .set('temporaryAttribute', Map({}));

    expect(appReducer(state, addAttributeToTempContentType('string'))).toEqual(expected);
  });

  it('should handle the addAttributeToTempContentType action correctly if the type is number', () => {
    state = state
      .setIn(['temporaryAttribute', 'name'], 'test')
      .setIn(['temporaryAttribute', 'type'], 'biginteger');

    const expected = state
      .setIn(['newContentType', 'attributes', 'test', 'type'], 'biginteger')
      .set('temporaryAttribute', Map({}));

    expect(appReducer(state, addAttributeToTempContentType('number'))).toEqual(expected);
  });

  it('should handle the cancelNewContentType action correctly', () => {
    state = state
      .setIn(['newContentType', 'name'], 'test')
      .setIn(['newContentType', 'attributes'], { test: { type: 'string' } });

    const expected = state.set(
      'newContentType',
      fromJS({
        collectionName: '',
        connection: 'default',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      }),
    );

    expect(appReducer(state, cancelNewContentType())).toEqual(expected);
  });

  it('should handle the clearTemporaryAttribute action correctly', () => {
    state = state
      .setIn(['temporaryAttribute', 'name'], 'test')
      .setIn(['temporaryAttribute', 'type'], 'string');

    const expected = state.set('temporaryAttribute', Map({}));

    expect(appReducer(state, clearTemporaryAttribute())).toEqual(expected);
  });

  it('should handle the clearTemporaryAttributeRelation action correctly', () => {
    state = state
      .setIn(['initialTemporaryAttributeRelation', 'name'], 'test')
      .setIn(['initialTemporaryAttributeRelation', 'target'], 'test1')
      .setIn(['temporaryAttributeRelation', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'target'], 'test1');

    const expected = state
      .set(
        'temporaryAttributeRelation',
        Map({
          name: '',
          columnName: '',
          dominant: false,
          targetColumnName: '',
          key: '-',
          nature: 'oneWay',
          plugin: '',
          target: '',
          unique: false,
        }),
      )
      .set(
        'initialTemporaryAttributeRelation',
        Map({
          name: '',
          columnName: '',
          dominant: false,
          targetColumnName: '',
          key: '-',
          nature: 'oneWay',
          plugin: '',
          target: '',
          unique: false,
        }),
      );

    expect(appReducer(state, clearTemporaryAttributeRelation())).toEqual(expected);
  });

  it('should handle the createTempContentType action correctly', () => {
    const newContentType = {
      collectionName: 'test',
      connection: 'test',
      description: '',
      mainField: 'test',
      name: 'test',
      attributes: {},
    };
    state = state.set('newContentType', newContentType);
    const expected = state
      .set(
        'models',
        List([
          {
            icon: 'fa-cube',
            name: 'product',
            description: '',
            fields: 1,
            isTemporary: false,
          },
          {
            icon: 'fa-cube',
            name: 'test',
            description: '',
            fields: 0,
            isTemporary: true,
          },
        ]),
      )
      .set('newContentTypeClone', newContentType);

    expect(appReducer(state, createTempContentType())).toEqual(expected);
  });

  it('should handle the deleteModelAttribute action correctly', () => {
    const keys = ['modifiedData', 'product', 'attributes', 'name'];
    const expected = state.removeIn(['modifiedData', 'product', 'attributes', 'name']);

    expect(appReducer(state, deleteModelAttribute(keys))).toEqual(expected);
  });

  it('should handle the deleteModelAttribute action correctly if the attribute has a relation with itself that is not oneWay', () => {
    const keys = ['modifiedData', 'product', 'attributes', 'strapi'];
    state = state
      .setIn(
        ['modifiedData', 'product', 'attributes', 'strapi'],
        Map({
          dominant: true,
          columnName: '',
          targetColumnName: '',
          key: 'notstrapi',
          nature: 'manyToOne',
          plugin: '',
          target: 'product',
          unique: false,
        }),
      )
      .setIn(
        ['modifiedData', 'product', 'attributes', 'notstrapi'],
        Map({
          dominant: false,
          columnName: '',
          targetColumnName: '',
          key: 'strapi',
          nature: 'oneToMany',
          plugin: '',
          target: 'product',
          unique: false,
        }),
      );
    const expected = state
      .removeIn(['modifiedData', 'product', 'attributes', 'strapi'])
      .removeIn(['modifiedData', 'product', 'attributes', 'notstrapi']);

    expect(appReducer(state, deleteModelAttribute(keys))).toEqual(expected);
  });

  it('should handle the deleteModelAttribute action correctly if the attribute has a relation with itself that is oneWay', () => {
    const keys = ['modifiedData', 'product', 'attributes', 'strapi'];
    state = state.setIn(
      ['modifiedData', 'product', 'attributes', 'strapi'],
      Map({
        dominant: true,
        columnName: '',
        targetColumnName: '',
        key: '-',
        nature: 'oneway',
        plugin: '',
        target: 'product',
        unique: false,
      }),
    );

    const expected = state.removeIn(['modifiedData', 'product', 'attributes', 'strapi']);

    expect(appReducer(state, deleteModelAttribute(keys))).toEqual(expected);
  });

  it('should handle the deleteModelSucceeded action correctly', () => {
    const expected = state
      .set('modifiedData', Map({}))
      .set('initialData', Map({}))
      .set('models', List([]));

    expect(appReducer(state, deleteModelSucceeded('product'))).toEqual(expected);
  });

  it('should handle the deleteTemporaryModel action correctly', () => {
    const tempCt = {
      collectionName: 'test',
      connection: 'test',
      description: '',
      mainField: 'test',
      name: 'test',
      attributes: {},
    };
    state = state
      .set(
        'models',
        List([
          {
            icon: 'fa-cube',
            name: 'product',
            description: '',
            fields: 1,
            isTemporary: false,
          },
          {
            icon: 'fa-cube',
            name: 'test',
            description: '',
            fields: 0,
            isTemporary: true,
          },
        ]),
      )
      .set('newContentType', tempCt)
      .set('newContentTypeClone', tempCt);
    const emptyCt = {
      collectionName: '',
      connection: '',
      description: '',
      mainField: '',
      name: '',
      attributes: {},
    };
    const expected = state
      .set(
        'models',
        List([
          {
            icon: 'fa-cube',
            name: 'product',
            description: '',
            fields: 1,
            isTemporary: false,
          },
        ]),
      )
      .set('newContentType', fromJS(emptyCt))
      .set('newContentTypeClone', fromJS(emptyCt));

    expect(appReducer(state, deleteTemporaryModel())).toEqual(expected);
  });

  it('should handle the getDataSucceededAction correctly', () => {
    const models = [
      {
        icon: 'fa-cube',
        name: 'permission',
        description: '',
        fields: 6,
        source: 'users-permissions',
        isTemporary: false,
      },
    ];
    const allModels = [
      {
        collectionName: 'users-permissions_permission',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'permission',
        attributes: [
          {
            name: 'type',
            params: { type: 'string', required: true, configurable: false },
          },
          {
            name: 'controller',
            params: { type: 'string', required: true, configurable: false },
          },
        ],
      },
    ];
    const initialData = {
      permission: {
        collectionName: 'users-permissions_permission',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'permission',
        attributes: OrderedMap(
          fromJS({
            type: {
              type: 'string',
              required: true,
              configurable: false,
            },
            controller: {
              type: 'string',
              required: true,
              configurable: false,
            },
          }),
        ),
      },
    };
    const connections = ['default'];

    const expected = state
      .set('modifiedData', fromJS(initialData))
      .set('initialData', fromJS(initialData))
      .set('models', List(models))
      .set('isLoading', false)
      .setIn(['newContentType', 'connection'], 'default')
      .set('connections', List(connections));

    expect(appReducer(state, getDataSucceeded({ allModels, models }, connections))).toEqual(expected);
  });

  it('should handle the onChangeExistingContentTypeMainInfos action correctly', () => {
    const expected = state.setIn(['modifiedData', 'product', 'name'], 'test');
    const target = { name: 'product.name', value: 'test' };

    expect(appReducer(state, onChangeExistingContentTypeMainInfos({ target }))).toEqual(expected);
  });

  it('should handle the onChangeNewContentTypeMainInfos action correctly', () => {
    const expected = state.setIn(['newContentType', 'name'], 'test');
    const target = { name: 'name', value: 'test' };

    expect(appReducer(state, onChangeNewContentTypeMainInfos({ target }))).toEqual(expected);
  });

  it('should handle the onChangeAttribute action correctly', () => {
    const expected = state.setIn(['temporaryAttribute', 'name'], 'test');
    const target = { name: 'name', value: 'test' };

    expect(appReducer(state, onChangeAttribute({ target }))).toEqual(expected);
  });

  it('should handle the onChangeRelation action correctly', () => {
    const expected = state.setIn(['temporaryAttributeRelation', 'name'], 'test');
    const target = { name: 'name', value: 'test' };

    expect(appReducer(state, onChangeRelation({ target }))).toEqual(expected);
  });

  it('should handle the onChangeRelationNature action correctly for the oneWay', () => {
    state = state
      .setIn(['temporaryAttributeRelation', 'name'], 'tests')
      .setIn(['temporaryAttributeRelation', 'nature'], 'manyToMany')
      .setIn(['temporaryAttributeRelation', 'key'], 'something');

    const expected = state
      .setIn(['temporaryAttributeRelation', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'nature'], 'oneWay')
      .setIn(['temporaryAttributeRelation', 'key'], '-');

    expect(appReducer(state, onChangeRelationNature('oneWay', null))).toEqual(expected);
  });

  it('should handle the onChangeRelationNature action correctly for the manyToMany', () => {
    state = state.setIn(['temporaryAttributeRelation', 'name'], 'test');

    const expected = state
      .setIn(['temporaryAttributeRelation', 'name'], 'tests')
      .setIn(['temporaryAttributeRelation', 'dominant'], true)
      .setIn(['temporaryAttributeRelation', 'nature'], 'manyToMany')
      .setIn(['temporaryAttributeRelation', 'key'], 'strapis');

    expect(appReducer(state, onChangeRelationNature('manyToMany', 'strapi'))).toEqual(expected);
  });

  it('should handle the onChangeRelationNature action correctly for the manyToOne', () => {
    state = state.setIn(['temporaryAttributeRelation', 'name'], 'test');

    const expected = state
      .setIn(['temporaryAttributeRelation', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'nature'], 'manyToOne')
      .setIn(['temporaryAttributeRelation', 'key'], 'strapis');

    expect(appReducer(state, onChangeRelationNature('manyToOne', 'strapi'))).toEqual(expected);
  });

  it('should handle the onChangeRelationNature action correctly for the oneToMany', () => {
    state = state.setIn(['temporaryAttributeRelation', 'name'], 'test');

    const expected = state
      .setIn(['temporaryAttributeRelation', 'name'], 'tests')
      .setIn(['temporaryAttributeRelation', 'nature'], 'oneToMany')
      .setIn(['temporaryAttributeRelation', 'key'], 'strapi');

    expect(appReducer(state, onChangeRelationNature('oneToMany', 'strapi'))).toEqual(expected);
  });

  it('should handle the onChangeRelationTarget action correctly for the oneWay', () => {
    state = state
      .setIn(['temporaryAttributeRelation', 'name'], 'test')
      .setIn(['temporaryAttributeRelation', 'target'], 'test');

    const expected = state
      .setIn(['temporaryAttributeRelation', 'target'], 'strapi')
      .setIn(['temporaryAttributeRelation', 'plugin'], '');

    expect(appReducer(state, onChangeRelationTarget({ name: 'strapi', source: null }, null, true))).toEqual(
      expected,
    );
  });

  it('should handle the onChangeRelationTarget action correctly for the manyToMany', () => {
    state = state
      .setIn(['temporaryAttributeRelation', 'name'], 'tests')
      .setIn(['temporaryAttributeRelation', 'nature'], 'manyToMany')
      .setIn(['temporaryAttributeRelation', 'key'], 'something')
      .setIn(['temporaryAttributeRelation', 'target'], 'something');

    const expected = state
      .setIn(['temporaryAttributeRelation', 'target'], 'strapi')
      .setIn(['temporaryAttributeRelation', 'key'], 'soupettes')
      .setIn(['temporaryAttributeRelation', 'name'], 'strapis');

    expect(
      appReducer(state, onChangeRelationTarget({ name: 'strapi', source: null }, 'soupette', false)),
    ).toEqual(expected);
  });

  it('should handle the resetEditExistingContentType action correctly', () => {
    state = state
      .setIn(['modifiedData', 'product', 'attributes', 'test'], { type: 'string' })
      .set('temporaryAttribute', { name: 'test', type: 'string' });
    const expected = state
      .removeIn(['modifiedData', 'product', 'attributes', 'test'])
      .set('temporaryAttribute', Map({}));

    expect(appReducer(state, resetEditExistingContentType('product'))).toEqual(expected);
  });

  it('should handle the resetExistingContentTypeMainInfos action correctly', () => {
    state = state
      .setIn(['modifiedData', 'product', 'attributes', 'test'], { type: 'string' })
      .setIn(['modifiedData', 'product', 'name'], 'anothername');
    const expected = state.setIn(['modifiedData', 'product', 'name'], 'product');

    expect(appReducer(state, resetExistingContentTypeMainInfos('product'))).toEqual(expected);
  });

  it('should handle the resetEditTempContentType action correctly', () => {
    state = state.setIn(['newContentType', 'attributes'], { test: { type: 'string' } });
    const expected = state.setIn(['newContentType', 'attributes'], Map({}));

    expect(appReducer(state, resetEditTempContentType())).toEqual(expected);
  });

  it('should handle the resetNewContentTypeMainInfos action correctly', () => {
    state = state
      .setIn(['newContentType', 'name'], 'test2')
      .setIn(['newContentTypeClone', 'name'], 'test')
      .setIn(['newContentType', 'attributes', 'name', 'type'], 'string');
    const expected = state.setIn(['newContentType', 'name'], 'test');

    expect(appReducer(state, resetNewContentTypeMainInfos())).toEqual(expected);
  });

  it('should handle the resetProps action correctly', () => {
    const expected = fromJS({
      connections: List([]),
      initialData: {},
      isLoading: true,
      models: List([]),
      modifiedData: {},
      newContentType: {
        collectionName: '',
        connection: '',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      newContentTypeClone: {
        collectionName: '',
        connection: '',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      temporaryAttribute: {},
      initialTemporaryAttributeRelation: {
        name: '',
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: '',
        unique: false,
      },
      temporaryAttributeRelation: {
        name: '',
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: '',
        unique: false,
      },
    });

    expect(appReducer(state, resetProps())).toEqual(expected);
  });

  it('should handle the saveEditedAttribute action correctly if the model is not temporary', () => {
    state = state.set('temporaryAttribute', Map({ name: 'test', type: 'string' }));
    const expected = state
      .removeIn(['modifiedData', 'product', 'attributes', 'name'])
      .setIn(['modifiedData', 'product', 'attributes', 'test', 'type'], 'string');

    expect(appReducer(state, saveEditedAttribute('name', false, 'product'))).toEqual(expected);
  });

  it('should handle the saveEditedAttribute action correctly if the model is temporary', () => {
    state = state
      .set('temporaryAttribute', Map({ name: 'test', type: 'string' }))
      .setIn(['newContentType', 'attributes', 'name', 'type'], 'string');
    const expected = state
      .removeIn(['newContentType', 'attributes', 'name'])
      .setIn(['newContentType', 'attributes', 'test', 'type'], 'string');

    expect(appReducer(state, saveEditedAttribute('name', true, null))).toEqual(expected);
  });

  it('should handle the setTemporaryAttribute action correctly if the model is not temporary', () => {
    const expected = state
      .setIn(['temporaryAttribute', 'name'], 'name')
      .setIn(['temporaryAttribute', 'type'], 'string');

    expect(appReducer(state, setTemporaryAttribute('name', false, 'product'))).toEqual(expected);
  });

  it('should handle the setTemporaryAttribute action correctly if the model is temporary', () => {
    state = state.setIn(['newContentType', 'attributes', 'name', 'type'], 'string');
    const expected = state
      .setIn(['temporaryAttribute', 'name'], 'name')
      .setIn(['temporaryAttribute', 'type'], 'string');

    expect(appReducer(state, setTemporaryAttribute('name', true, undefined))).toEqual(expected);
  });

  it('should handle the submitTempContentType action correctly', () => {
    state = state
      .setIn(['newContentType', 'name'], 'atest')
      .setIn(['newContentType', 'attributes', 'name', 'type'], 'string')
      .set(
        'models',
        List([
          {
            icon: 'fa-cube',
            name: 'product',
            description: '',
            fields: 1,
            isTemporary: false,
          },
          {
            icon: 'fa-cube',
            name: 'atest',
            description: '',
            fields: 1,
            isTemporary: true,
          },
        ]),
      );
    const newCt = fromJS({
      collectionName: '',
      connection: '',
      description: '',
      mainField: '',
      name: '',
      attributes: {},
    });
    const expected = state
      .setIn(['modifiedData', 'atest'], state.get('newContentType'))
      .setIn(['initialData', 'atest'], state.get('newContentType'))
      .set(
        'models',
        List([
          {
            icon: 'fa-cube',
            name: 'atest',
            description: '',
            fields: 1,
            isTemporary: false,
          },
          {
            icon: 'fa-cube',
            name: 'product',
            description: '',
            fields: 1,
            isTemporary: false,
          },
        ]),
      )
      .set('newContentType', newCt)
      .set('newContentTypeClone', newCt);

    expect(appReducer(state, submitTempContentTypeSucceeded())).toEqual(expected);
  });

  it('should handle the updateTempContentType action correctly', () => {
    state = state.setIn(['newContentType', 'name'], 'test').updateIn(['models'], list =>
      list.push({
        icon: 'fa-cube',
        name: 'test1',
        description: '',
        fields: 0,
        isTemporary: true,
      }),
    );

    const expected = state
      .setIn(['newContentTypeClone', 'name'], 'test')
      .setIn(['models', 1, 'name'], 'test');

    expect(appReducer(state, updateTempContentType())).toEqual(expected);
  });
});
