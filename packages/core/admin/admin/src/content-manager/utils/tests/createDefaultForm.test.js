import createDefaultForm from '../createDefaultForm';

describe('CONTENT MANAGER | utils | createDefaultForm', () => {
  it('should return an empty object if there is no default value', () => {
    const attributes = {
      test: {
        type: 'text',
      },
    };

    expect(createDefaultForm(attributes, {})).toEqual({});
  });

  it('should init the requide dynamic zone type with an empty array', () => {
    expect(createDefaultForm({ test: { type: 'dynamiczone', required: true } })).toEqual({
      test: [],
    });
  });

  it('should set the default values correctly', () => {
    const attributes = {
      text: {
        type: 'text',
        default: 'test',
      },
      email: {
        type: 'email',
        default: 'test@test.com',
      },
      date: {
        type: 'data',
      },
    };

    expect(createDefaultForm(attributes)).toEqual({ text: 'test', email: 'test@test.com' });
  });

  it('should create the form correctly for the required component type', () => {
    const ctAttributes = {
      simple: {
        type: 'component',
        component: 'default.test',
        repeatable: false,
        required: true,
      },
      repeatable: {
        type: 'component',
        component: 'test.test',
        repeatable: true,
        required: true,
        min: 1,
      },
    };
    const components = {
      'default.test': {
        attributes: {
          text: {
            type: 'text',
          },
          email: {
            type: 'email',
          },
        },
      },
      'test.test': {
        attributes: {
          text: {
            type: 'text',
            default: 'test',
          },
          email: {
            type: 'email',
          },
        },
      },
    };

    const expected = {
      simple: {},
      repeatable: [
        {
          text: 'test',
        },
      ],
    };

    expect(createDefaultForm(ctAttributes, components)).toEqual(expected);
  });
});
