import createModifiedDataSchema from '../createModifiedDataSchema';

describe('CONTENT TYPE BUILDER | COMPONENTS | DataManagerProvider | utils | createModifiedDataSchema', () => {
  it('should create the modifiedData object correctly when it is used in the content type view and there is no associated components', () => {
    const dataSchema = {
      apiID: 'test',
      schema: {
        attributes: {
          name: { type: 'string' },
        },
      },
    };

    const retrievedComponents = [];
    const components = {};
    const isInContentTypeView = true;

    const expected = {
      contentType: dataSchema,
      components: {},
    };

    expect(
      createModifiedDataSchema(dataSchema, retrievedComponents, components, isInContentTypeView)
    ).toEqual(expected);
  });

  it('should create the modifiedData object correctly when it is used in the component view and there is no associated components', () => {
    const dataSchema = {
      apiID: 'test',
      schema: {
        attributes: {
          name: { type: 'string' },
        },
      },
    };

    const retrievedComponents = [];
    const components = {};
    const isInContentTypeView = false;

    const expected = {
      component: dataSchema,
      components: {},
    };

    expect(
      createModifiedDataSchema(dataSchema, retrievedComponents, components, isInContentTypeView)
    ).toEqual(expected);
  });

  it('should create the modifiedData object correctly when it is used in the content type view and there are some associated components', () => {
    const dataSchema = {
      apiID: 'test',
      schema: {
        attributes: {
          name: { type: 'string' },
          compo: { type: 'component', component: 'blog.dish' },
        },
      },
    };

    const retrievedComponents = ['blog.dish'];
    const components = {
      'blog.dish': {
        schema: { attributes: { name: { type: 'string' } } },
      },
      'blog.test': {
        schema: { attributes: { name: { type: 'string' } } },
      },
    };
    const isInContentTypeView = true;

    const expected = {
      contentType: dataSchema,
      components: {
        'blog.dish': {
          schema: { attributes: { name: { type: 'string' } } },
        },
      },
    };

    expect(
      createModifiedDataSchema(dataSchema, retrievedComponents, components, isInContentTypeView)
    ).toEqual(expected);
  });
});
