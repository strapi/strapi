import reducer from '../reducer';

describe('CONTENT MANAGER | CONTAINERS | ListView | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      labelForm: {},
      labelToEdit: '',
      initialData: {},
      modifiedData: {},
      status: 'resolved',
    };
  });

  it('should handle the default action correctly', () => {
    const expected = state;

    expect(reducer(state, {})).toEqual(expected);
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
      const action = { type: 'ADD_FIELD', item: 'title' };

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
      const action = { type: 'MOVE_FIELD', atIndex: 1, originalIndex: 2 };

      expect(reducer(state, action)).toEqual(expected);
    });
    it('should not change the field list if 1 item', () => {
      state.modifiedData = {
        layouts: {
          list: ['id'],
        },
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            list: ['id'],
          },
        },
      };
      const action = { type: 'MOVE_FIELD', atIndex: 1, originalIndex: 2 };

      expect(reducer(state, action)).toEqual(expected);
    });
    it('should not change the field list if indices are wrong', () => {
      state.modifiedData = {
        layouts: {
          list: ['id', 'description', 'id'],
        },
      };
      const expected = {
        ...state,
        modifiedData: {
          layouts: {
            list: ['id', 'description', 'id'],
          },
        },
      };
      const action = { type: 'MOVE_FIELD', atIndex: 5, originalIndex: 7 };

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
      const action = { type: 'ON_CHANGE', keys: 'settings.pageSize', value: 50 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_LABEL_METAS', () => {
    it('should set the attribute metas label in the label form', () => {
      const expected = {
        ...state,
        labelForm: {
          label: 'Cover',
        },
      };
      const action = { type: 'ON_CHANGE_LABEL_METAS', name: 'label', value: 'Cover' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_RESET', () => {
    it('should set the current modified data to the initial state', () => {
      state.modifiedData = {
        layouts: {
          list: ['id', 'description', 'title'],
        },
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
      const action = { type: 'REMOVE_FIELD', index: 1 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_LABEL_TO_EDIT', () => {
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
        labelToEdit: 'cover',
        labelForm: {
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
      const action = { type: 'SET_LABEL_TO_EDIT', labelToEdit: 'cover' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('UNSET_LABEL_TO_EDIT', () => {
    it('should unset the label to edit and clean the label form', () => {
      state = {
        ...state,
        labelToEdit: 'cover',
        labelForm: {
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
        labelToEdit: '',
        labelForm: {},
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
      const action = { type: 'UNSET_LABEL_TO_EDIT', labelToEdit: 'cover' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SUBMIT_LABEL_FORM', () => {
    it('should submit the label and the sortable value of the field to edit', () => {
      state = {
        ...state,
        labelToEdit: 'cover',
        labelForm: {
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
        labelToEdit: 'cover',
        labelForm: {
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
      const action = { type: 'SUBMIT_LABEL_FORM', labelToEdit: 'cover' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SUBMIT_SUCCEEDED', () => {
    it('should submit the label and the sortable value of the field to edit', () => {
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
        initialData: {
          metadatas: {
            cover: {
              list: {
                label: 'Cover',
                sortable: false,
              },
            },
          },
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
      const action = { type: 'SUBMIT_SUCCEEDED' };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
