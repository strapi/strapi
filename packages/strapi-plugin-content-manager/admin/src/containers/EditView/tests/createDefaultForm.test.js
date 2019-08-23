import createDefaultForm from '../utils/createDefaultForm';

describe('Content Manager | EditView | utils | createDefaultForm', () => {
  it('should return an empty object if there is no group or default value in the argument', () => {
    const attributes = {
      title: {
        type: 'string',
      },
      description: {
        type: 'text',
      },
    };

    expect(createDefaultForm(attributes)).toEqual({});
  });

  it('should return an object containing the name of the fields with the default value', () => {
    const attributes = {
      title: {
        type: 'string',
        default: 'test',
      },
      description: {
        type: 'text',
        default: 'test1',
      },
    };

    expect(createDefaultForm(attributes)).toEqual({
      title: 'test',
      description: 'test1',
    });
  });

  it('should set the json fields to null for non required fields', () => {
    const attributes = {
      test: {
        type: 'json',
      },
      test1: {
        type: 'string',
      },
    };

    expect(createDefaultForm(attributes)).toEqual({ test: null });
  });

  it('should set the json fields to {} for required fields', () => {
    const attributes = {
      test: {
        type: 'json',
        required: true,
      },
      test1: {
        type: 'json',
      },
      test2: {
        type: 'json',
        default: {
          ok: true,
        },
      },
    };

    expect(createDefaultForm(attributes)).toEqual({
      test: {},
      test1: null,
      test2: { ok: true },
    });
  });

  it('should handle the group fields correctly', () => {
    const attributes = {
      title: {
        type: 'string',
        default: 'test',
      },
      description: {
        type: 'text',
      },
      group: {
        type: 'group',
      },
      group1: {
        type: 'group',
        required: true,
      },
      group2: {
        type: 'group',
        repeatable: true,
      },
      group3: {
        type: 'group',
        repeatable: true,
        required: true,
      },
      group4: {
        type: 'group',
        repeatable: true,
        required: true,
        min: 2,
      },
      group5: {
        type: 'group',
        repeatable: true,
        min: 2,
      },
    };
    expect(createDefaultForm(attributes)).toEqual({
      title: 'test',
      group1: {},
      group3: [],
      group4: [{ _temp__id: 0 }, { _temp__id: 1 }],
      group5: [{ _temp__id: 0 }, { _temp__id: 1 }],
    });
  });
});
