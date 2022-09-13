import reducer from '../reducer';

describe('CONTENT MANAGER | CONTAINERS | EditSettingsView | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      fieldForm: {},
      componentLayouts: {},
      metaToEdit: '',
      initialData: {},
      metaForm: {},
      modifiedData: {},
    };
  });

  it('should handle the default action correctly', () => {
    const expected = state;

    expect(reducer(state, {})).toEqual(expected);
  });

  describe('ADD_RELATION', () => {
    it('should add a relation to the editRelations layout', () => {
      state.modifiedData.layouts = {
        editRelations: ['likes'],
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            editRelations: ['likes', 'categories'],
          },
        },
      };
      const action = { type: 'ADD_RELATION', name: 'categories' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('MOVE_RELATION', () => {
    it('should move the categories relation from the second place to the third', () => {
      state.modifiedData.layouts = {
        editRelations: ['likes', 'categories', 'users'],
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            editRelations: ['likes', 'users', 'categories'],
          },
        },
      };
      const action = { type: 'MOVE_RELATION', fromIndex: 1, toIndex: 2 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('MOVE_ROW', () => {
    it('should move the third field row to the first position', () => {
      state.modifiedData.layouts = {
        edit: [
          { rowId: 0, rowContent: [] },
          { rowId: 1, rowContent: [] },
          { rowId: 2, rowContent: [] },
          { rowId: 3, rowContent: [] },
        ],
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            edit: [
              { rowId: 2, rowContent: [] },
              { rowId: 0, rowContent: [] },
              { rowId: 1, rowContent: [] },
              { rowId: 3, rowContent: [] },
            ],
          },
        },
      };
      const action = { type: 'MOVE_ROW', fromIndex: 2, toIndex: 0 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_ADD_FIELD', () => {
    it('should add a size 12 field that fill the first row', () => {
      state.modifiedData.attributes = {
        description: {
          type: 'richtext',
        },
      };
      state.modifiedData.layouts = {
        edit: [
          {
            rowId: 0,
            rowContent: [],
          },
        ],
      };
      const expected = {
        ...state,
        modifiedData: {
          attributes: {
            description: {
              type: 'richtext',
            },
          },
          layouts: {
            edit: [
              {
                rowId: 0,
                rowContent: [{ name: 'description', size: 12 }],
              },
            ],
          },
        },
      };
      const action = { type: 'ON_ADD_FIELD', name: 'description' };
      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a size 6 field to the row and fill the rest of the row (12-6) with a _TEMP_ element', () => {
      state.modifiedData.attributes = {
        title: {
          type: 'string',
        },
      };
      state.modifiedData.layouts = {
        edit: [
          {
            rowId: 0,
            rowContent: [],
          },
        ],
      };
      const expected = {
        ...state,
        modifiedData: {
          attributes: {
            title: {
              type: 'string',
            },
          },
          layouts: {
            edit: [
              {
                rowId: 0,
                rowContent: [
                  { name: 'title', size: 6 },
                  { name: '_TEMP_', size: 6 },
                ],
              },
            ],
          },
        },
      };
      const action = { type: 'ON_ADD_FIELD', name: 'title' };
      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a small field to fill the first field row and remove the _TEMP_ element', () => {
      state.modifiedData.attributes = {
        isActive: {
          type: 'boolean',
        },
      };
      state.modifiedData.layouts = {
        edit: [
          {
            rowId: 0,
            rowContent: [
              { name: 'title', size: 8 },
              { name: '_TEMP_', size: 4 },
            ],
          },
        ],
      };
      const expected = {
        ...state,
        modifiedData: {
          attributes: {
            isActive: {
              type: 'boolean',
            },
          },
          layouts: {
            edit: [
              {
                rowId: 0,
                rowContent: [
                  { name: 'title', size: 8 },
                  { name: 'isActive', size: 4 },
                ],
              },
            ],
          },
        },
      };
      const action = { type: 'ON_ADD_FIELD', name: 'isActive' };
      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a size 6 field to create a new row', () => {
      state.modifiedData.attributes = {
        title: {
          type: 'string',
        },
      };
      state.modifiedData.layouts = {
        edit: [
          {
            rowId: 0,
            rowContent: [
              { name: 'isActive', size: 4 },
              { name: 'slug', size: 6 },
              { name: '_TEMP_', size: 2 },
            ],
          },
        ],
      };
      const expected = {
        ...state,
        modifiedData: {
          attributes: {
            title: {
              type: 'string',
            },
          },
          layouts: {
            edit: [
              {
                rowId: 0,
                rowContent: [
                  { name: 'isActive', size: 4 },
                  { name: 'slug', size: 6 },
                  { name: '_TEMP_', size: 2 },
                ],
              },
              {
                rowId: 1,
                rowContent: [
                  { name: 'title', size: 6 },
                  { name: '_TEMP_', size: 6 },
                ],
              },
            ],
          },
        },
      };
      const action = { type: 'ON_ADD_FIELD', name: 'title' };
      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should set the data to change in the modifiedData object', () => {
      state.modifiedData.settings = {
        mainField: 'id',
      };
      const expected = {
        ...state,
        modifiedData: {
          settings: {
            mainField: 'postal_code',
          },
        },
      };
      const action = { type: 'ON_CHANGE', keys: ['settings', 'mainField'], value: 'postal_code' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_META', () => {
    it('should set the data to change in the modifiedData.metadata object', () => {
      state.metaForm.metadata = {
        label: 'Postal_coder',
      };
      const expected = {
        ...state,
        metaForm: {
          metadata: {
            label: 'postal_code',
          },
        },
      };
      const action = { type: 'ON_CHANGE_META', keys: ['label'], value: 'postal_code' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_SIZE', () => {
    it('should set the data to change in the modifiedData.size object', () => {
      state.metaForm.metadata = {};

      const expected = {
        ...state,
        metaForm: {
          metadata: {},
          size: 6,
        },
      };
      const action = { type: 'ON_CHANGE_SIZE', name: 'postal_code', value: 6 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_RESET', () => {
    it('should set the data to change in the modifiedData object', () => {
      state.modifiedData = {
        test: 'Postal_coder',
      };
      const expected = {
        ...state,
        modifiedData: {},
      };
      const action = { type: 'ON_RESET' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REMOVE_FIELD', () => {
    it('should remove the size 12 field and the empty row', () => {
      state.modifiedData.layouts = {
        edit: [
          {
            rowId: 0,
            rowContent: [{ name: 'description', size: 12 }],
          },
        ],
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            edit: [],
          },
        },
      };
      const action = { type: 'REMOVE_FIELD', rowIndex: 0, fieldIndex: 0 };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should remove the slug field from the first row and change the size of the _TEMP_ element to fill the row', () => {
      state.modifiedData.layouts = {
        edit: [
          {
            rowId: 0,
            rowContent: [
              { name: 'isActive', size: 4 },
              { name: 'slug', size: 6 },
              { name: '_TEMP_', size: 2 },
            ],
          },
        ],
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            edit: [
              {
                rowId: 0,
                rowContent: [
                  { name: 'isActive', size: 4 },
                  { name: '_TEMP_', size: 8 },
                ],
              },
            ],
          },
        },
      };
      const action = { type: 'REMOVE_FIELD', rowIndex: 0, fieldIndex: 1 };
      //
      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REMOVE_RELATION', () => {
    it('should remove the first relation from the relation list', () => {
      state.modifiedData.layouts = {
        editRelations: ['likes', 'categories'],
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            editRelations: ['categories'],
          },
        },
      };
      const action = { type: 'REMOVE_RELATION', index: 0 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REORDER_DIFF_ROW', () => {
    it('should move a field to another row', () => {
      state.modifiedData = {
        layouts: {
          edit: [
            {
              rowId: 0,
              rowContent: [
                { name: 'first', size: 4 },
                { name: 'second', size: 4 },
                { name: '_TEMP_', size: 4 },
              ],
            },
            {
              rowId: 1,
              rowContent: [
                { name: 'slug', size: 6 },
                { name: '_TEMP_', size: 6 },
              ],
            },
          ],
        },
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            edit: [
              {
                rowId: 0,
                rowContent: [
                  { name: 'first', size: 4 },
                  { name: 'slug', size: 6 },
                  { name: '_TEMP_', size: 2 },
                ],
              },
              {
                rowId: 1,
                rowContent: [
                  { name: 'second', size: 4 },
                  { name: '_TEMP_', size: 8 },
                ],
              },
            ],
          },
        },
      };
      const action = {
        type: 'REORDER_DIFF_ROW',
        dragIndex: 0,
        hoverIndex: 1,
        dragRowIndex: 1,
        hoverRowIndex: 0,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should try to move a field to another row but leave it on the same row if there is not enough space', () => {
      state.modifiedData = {
        layouts: {
          edit: [
            {
              rowId: 0,
              rowContent: [
                { name: 'first', size: 4 },
                { name: 'second', size: 4 },
                { name: '_TEMP_', size: 4 },
              ],
            },
            {
              rowId: 1,
              rowContent: [
                { name: 'slug', size: 6 },
                { name: '_TEMP_', size: 6 },
              ],
            },
          ],
        },
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            edit: [
              {
                rowId: 0,
                rowContent: [
                  { name: 'first', size: 4 },
                  { name: 'second', size: 4 },
                  { name: '_TEMP_', size: 4 },
                ],
              },
              {
                rowId: 1,
                rowContent: [
                  { name: 'slug', size: 6 },
                  { name: '_TEMP_', size: 6 },
                ],
              },
            ],
          },
        },
      };
      const action = {
        type: 'REORDER_DIFF_ROW',
        dragIndex: 0,
        hoverIndex: 2,
        dragRowIndex: 1,
        hoverRowIndex: 0,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REORDER_ROW', () => {
    it('should move the field from the second position to the first in a row', () => {
      state.modifiedData.layouts = {
        edit: [
          {
            rowId: 0,
            rowContent: [
              { name: 'city', size: 6 },
              { name: 'slug', size: 6 },
            ],
          },
          {
            rowId: 1,
            rowContent: [
              { name: 'test1', size: 4 },
              { name: 'test2', size: 4 },
              { name: 'test3', size: 4 },
            ],
          },
        ],
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            edit: [
              {
                rowId: 0,
                rowContent: [
                  { name: 'city', size: 6 },
                  { name: 'slug', size: 6 },
                ],
              },
              {
                rowId: 1,
                rowContent: [
                  { name: 'test2', size: 4 },
                  { name: 'test1', size: 4 },
                  { name: 'test3', size: 4 },
                ],
              },
            ],
          },
        },
      };
      const action = { type: 'REORDER_ROW', dragRowIndex: 1, dragIndex: 1, hoverIndex: 0 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_FIELD_TO_EDIT', () => {
    it('should set the metadatas of the field to edit', () => {
      state.modifiedData.metadatas = {
        city: {
          edit: {
            label: 'City',
          },
        },
      };
      const expected = {
        ...state,
        metaToEdit: 'city',
        metaForm: {
          metadata: {
            label: 'City',
          },
          size: 6,
        },
        modifiedData: {
          metadatas: {
            city: {
              edit: {
                label: 'City',
              },
            },
          },
        },
      };
      const action = { type: 'SET_FIELD_TO_EDIT', name: 'city' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SUBMIT_META_FORM', () => {
    it('should submit the meta form', () => {
      state.metaToEdit = 'city';
      state.metaForm = {
        metadata: {
          label: 'New City label',
        },
      };
      state.modifiedData.metadatas = {
        city: {
          edit: {
            label: 'City',
          },
        },
      };
      const expected = {
        ...state,
        metaToEdit: 'city',
        metaForm: {
          metadata: {
            label: 'New City label',
          },
        },
        modifiedData: {
          metadatas: {
            city: {
              edit: {
                label: 'New City label',
              },
            },
          },
        },
      };
      const action = { type: 'SUBMIT_META_FORM' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SUBMIT_SUCCEEDED', () => {
    it('should update the initial data', () => {
      state.modifiedData = {
        layouts: {
          metadatas: {
            city: {
              label: 'New city label',
            },
          },
        },
      };
      state.initialData = {};
      const expected = {
        ...state,
        initialData: {
          layouts: {
            metadatas: {
              city: {
                label: 'New city label',
              },
            },
          },
        },
        modifiedData: {
          layouts: {
            metadatas: {
              city: {
                label: 'New city label',
              },
            },
          },
        },
      };
      const action = { type: 'SUBMIT_SUCCEEDED' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('UNSET_FIELD_TO_EDIT', () => {
    it('should unset the metadatas to edit and the form data', () => {
      state.metaToEdit = 'city';
      state.metaForm.metadata = {
        label: 'New city label',
      };
      const expected = {
        ...state,
        metaToEdit: '',
        metaForm: {},
      };
      const action = { type: 'UNSET_FIELD_TO_EDIT' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
