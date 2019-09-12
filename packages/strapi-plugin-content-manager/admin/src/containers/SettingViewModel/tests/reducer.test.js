import { fromJS } from 'immutable';
import {
  addFieldToList,
  addRelation,
  moveListField,
  moveRelation,
  moveRow,
  onAddData,
} from '../actions';
import reducer from '../reducer';
import data from './data';

const listLayoutPath = ['modifiedData', 'layouts', 'list'];
const editLayoutPath = ['modifiedData', 'layouts', 'edit'];
const editRelationsLayoutPath = ['modifiedData', 'layouts', 'editRelations'];

describe('Content Manager | SettingViewModel | reducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      initialData: data,
      isLoading: true,
      itemFormType: '',
      itemNameToSelect: '',
      listFieldToEditIndex: 0,
      modifiedData: data,
      shouldToggleModalSubmit: true,
    });
  });

  it('should handle the addFieldToListAction correctly', () => {
    const expected = state.setIn(
      listLayoutPath,
      fromJS(['id', 'title', 'content', 'updated_at', 'published', 'number'])
    );

    expect(reducer(state, addFieldToList('number'))).toEqual(expected);
  });

  it('should handle the addRelation action correctly', () => {
    const newState = state.setIn(
      editRelationsLayoutPath,
      fromJS(['mainTag', 'linkedTags'])
    );
    const expected = state
      .setIn(
        editRelationsLayoutPath,
        fromJS(['mainTag', 'linkedTags', 'manyTags'])
      )
      .set('itemFormType', 'relation')
      .set('itemNameToSelect', 'manyTags');

    expect(reducer(newState, addRelation('manyTags'))).toEqual(expected);
  });

  it('should handle the moveFieldList action correctly', () => {
    const expected = state
      .setIn(
        listLayoutPath,
        fromJS(['id', 'content', 'updated_at', 'title', 'published'])
      )
      .set('listFieldToEditIndex', 3);

    expect(reducer(state, moveListField(1, 3))).toEqual(expected);
  });

  it('should handle the moveRelation action correctly', () => {
    const expected = state.setIn(
      editRelationsLayoutPath,
      fromJS(['linkedTags', 'manyTags', 'mainTag'])
    );

    expect(reducer(state, moveRelation(0, 2))).toEqual(expected);
  });

  it('should handle the moveRow action correctly', () => {
    const expected = state.setIn(
      editLayoutPath,
      fromJS([
        {
          rowId: 0,
          rowContent: [
            { name: 'pictures', size: 6 },
            { name: '_TEMP_', size: 6 },
          ],
        },
        {
          rowId: 10,
          rowContent: [{ name: 'fb_cta', size: 12 }],
        },
        {
          rowId: 1,
          rowContent: [
            { name: 'big_number', size: 4 },
            { name: 'number', size: 4 },
            { name: 'float_number', size: 4 },
          ],
        },
        {
          rowId: 5,

          rowContent: [{ name: 'ingredients', size: 12 }],
        },

        {
          rowId: 11,
          rowContent: [
            { name: 'published', size: 4 },
            { name: 'date', size: 4 },
            { name: '_TEMP_', size: 4 },
          ],
        },
      ])
    );

    expect(reducer(state, moveRow(3, 1))).toEqual(expected);
  });

  it('should handle the onAddData action correctly', () => {
    const expected = state
      .setIn(
        editLayoutPath,
        fromJS([
          {
            rowId: 0,
            rowContent: [
              { name: 'pictures', size: 6 },
              { name: '_TEMP_', size: 6 },
            ],
          },
          {
            rowId: 1,
            rowContent: [
              { name: 'big_number', size: 4 },
              { name: 'number', size: 4 },
              { name: 'float_number', size: 4 },
            ],
          },
          {
            rowId: 2,

            rowContent: [{ name: 'ingredients', size: 12 }],
          },
          {
            rowId: 3,
            rowContent: [{ name: 'fb_cta', size: 12 }],
          },
          {
            rowId: 4,
            rowContent: [
              { name: 'published', size: 4 },
              { name: 'date', size: 4 },
              { name: 'bool', size: 4 },
            ],
          },
        ])
      )
      .set('itemNameToSelect', 'bool')
      .set('itemFormType', 'boolean');

    expect(reducer(state, onAddData('bool'))).toEqual(expected);
  });
});
