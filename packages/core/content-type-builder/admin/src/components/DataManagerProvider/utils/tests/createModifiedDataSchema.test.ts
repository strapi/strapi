import { createModifiedDataSchema } from '../createModifiedDataSchema';

import type { Components } from '../../../../types';
import type { Internal } from '@strapi/types';

describe('CONTENT TYPE BUILDER | COMPONENTS | DataManagerProvider | utils | createModifiedDataSchema', () => {
  it('should create the modifiedData object correctly when it is used in the content type view and there is no associated components', () => {
    const dataSchema: any = {
      apiID: 'test',
      schema: {
        attributes: [{ type: 'string', name: 'name' }],
      },
    };

    const retrievedComponents: Internal.UID.Component[] = [];
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
    const dataSchema: any = {
      apiID: 'test',
      schema: {
        attributes: [{ type: 'string', name: 'name' }],
      },
    };

    const retrievedComponents: Internal.UID.Component[] = [];
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
    const dataSchema: any = {
      apiID: 'test',
      schema: {
        attributes: [
          { type: 'string', name: 'name' },
          { type: 'component', component: 'blog.dish', name: 'compo' },
        ],
      },
    };

    const retrievedComponents: Internal.UID.Component[] = ['blog.dish'];
    const components: Components = {
      'blog.dish': {
        uid: 'blog.dish',
        schema: { attributes: [{ name: 'name', type: 'string' }] },
      },
      'blog.test': {
        uid: 'blog.test',
        schema: { attributes: [{ type: 'string', name: 'name' }] },
      },
    };
    const isInContentTypeView = true;

    const expected = {
      contentType: dataSchema,
      components: {
        'blog.dish': {
          uid: 'blog.dish',
          schema: { attributes: [{ type: 'string', name: 'name' }] },
        },
      },
    };

    expect(
      createModifiedDataSchema(dataSchema, retrievedComponents, components, isInContentTypeView)
    ).toEqual(expected);
  });
});
