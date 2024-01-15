import {
  reducer,
  AddFieldAction,
  MoveFieldAction,
  OnChangeAction,
  OnChangeFieldMetasAction,
  RemoveFieldAction,
  SetFieldToEditAction,
  UnsetFieldToEditAction,
  SubmitFieldFormAction,
} from '../reducer';

describe('CONTENT MANAGER | CONTAINERS | ListSettingsView | reducer', () => {
  let state: any;

  beforeEach(() => {
    state = {
      fieldForm: {},
      fieldToEdit: '',
      initialData: {},
      modifiedData: {},
      status: 'resolved',
    };
  });

  it('should handle the default action correctly', () => {
    const expected = state;

    expect(reducer(state, {} as any)).toEqual(expected);
  });

  describe('ADD_FIELD', () => {
    it('should add a field to the layout correctly', () => {
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            list: ['title'],
          },
        },
      };
      const action: AddFieldAction = { type: 'ADD_FIELD', item: 'title' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('MOVE_FIELD', () => {
    it('should replace the title by the description and vice-versa', () => {
      state.modifiedData = {
        layouts: {
          list: ['id', 'description', 'title'],
        },
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            list: ['id', 'title', 'description'],
          },
        },
      };
      const action: MoveFieldAction = { type: 'MOVE_FIELD', atIndex: 1, originalIndex: 2 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should set the value related to the passed keys', () => {
      const expected = {
        ...state,
        modifiedData: {
          settings: {
            pageSize: 50,
          },
        },
      };
      const action: OnChangeAction = { type: 'ON_CHANGE', keys: 'settings.pageSize', value: 50 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_FIELD_METAS', () => {
    it('should set the attribute metas label in the label form', () => {
      const expected = {
        ...state,
        fieldForm: {
          label: 'Cover',
        },
      };
      const action: OnChangeFieldMetasAction = {
        type: 'ON_CHANGE_FIELD_METAS',
        name: 'label',
        value: 'Cover',
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REMOVE_FIELD', () => {
    it('should remove the field', () => {
      state.modifiedData = {
        layouts: {
          list: ['id', 'description', 'title'],
        },
        settings: {
          defaultSortBy: 'id',
        },
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            list: ['id', 'title'],
          },
          settings: {
            defaultSortBy: 'id',
          },
        },
      };
      const action: RemoveFieldAction = { type: 'REMOVE_FIELD', index: 1 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_FIELD_TO_EDIT', () => {
    it('should set the label form data of the field to edit', () => {
      state.modifiedData = {
        metadatas: {
          cover: {
            list: {
              label: 'Cover',
              sortable: false,
            },
          },
        },
      };
      const expected = {
        ...state,
        fieldToEdit: 'cover',
        fieldForm: {
          label: 'Cover',
          sortable: false,
        },
        modifiedData: {
          metadatas: {
            cover: {
              list: {
                label: 'Cover',
                sortable: false,
              },
            },
          },
        },
      };
      const action: SetFieldToEditAction = { type: 'SET_FIELD_TO_EDIT', fieldToEdit: 'cover' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('UNSET_FIELD_TO_EDIT', () => {
    it('should unset the label to edit and clean the label form', () => {
      state = {
        ...state,
        fieldToEdit: 'cover',
        fieldForm: {
          label: 'Cover',
          sortable: false,
        },
        modifiedData: {
          metadatas: {
            cover: {
              list: {
                label: 'Cover',
                sortable: false,
              },
            },
          },
        },
      };
      const expected = {
        ...state,
        fieldToEdit: '',
        fieldForm: {},
        modifiedData: {
          metadatas: {
            cover: {
              list: {
                label: 'Cover',
                sortable: false,
              },
            },
          },
        },
      };
      const action: UnsetFieldToEditAction = { type: 'UNSET_FIELD_TO_EDIT' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SUBMIT_FIELD_FORM', () => {
    it('should submit the label and the sortable value of the field to edit', () => {
      state = {
        ...state,
        fieldToEdit: 'cover',
        fieldForm: {
          label: 'New Cover',
          sortable: true,
        },
        modifiedData: {
          metadatas: {
            cover: {
              list: {
                label: 'Cover',
                sortable: false,
              },
            },
          },
        },
      };
      const expected = {
        ...state,
        fieldToEdit: 'cover',
        fieldForm: {
          label: 'New Cover',
          sortable: true,
        },
        modifiedData: {
          metadatas: {
            cover: {
              list: {
                label: 'New Cover',
                sortable: true,
              },
            },
          },
        },
      };
      const action: SubmitFieldFormAction = { type: 'SUBMIT_FIELD_FORM' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
