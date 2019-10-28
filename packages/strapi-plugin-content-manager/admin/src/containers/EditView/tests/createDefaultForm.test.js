import createDefaultForm from '../utils/createDefaultForm';

describe('Content Manager | EditView | utils | createDefaultForm', () => {
  it('should return an empty object if there is no component or default value in the argument', () => {
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

  it('should handle the component fields correctly', () => {
    const attributes = {
      title: {
        type: 'string',
        default: 'test',
      },
      description: {
        type: 'text',
      },
      component: {
        type: 'component',
      },
      component1: {
        type: 'component',
        required: true,
      },
      component2: {
        type: 'component',
        repeatable: true,
      },
      component3: {
        type: 'component',
        repeatable: true,
        required: true,
      },
      component4: {
        type: 'component',
        repeatable: true,
        required: true,
        min: 2,
      },
      component5: {
        type: 'component',
        repeatable: true,
        min: 2,
      },
    };
    expect(createDefaultForm(attributes)).toEqual({
      title: 'test',
      component1: {},
      component3: [],
      component4: [{ _temp__id: 0 }, { _temp__id: 1 }],
      component5: [{ _temp__id: 0 }, { _temp__id: 1 }],
    });
  });
});
