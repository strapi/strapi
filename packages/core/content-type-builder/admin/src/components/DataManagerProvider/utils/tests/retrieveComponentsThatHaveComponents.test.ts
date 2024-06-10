import {
  getComponentWithChildComponents,
  retrieveComponentsThatHaveComponents,
} from '../retrieveComponentsThatHaveComponents';

const data: any = {
  // Slider has a component
  'blog.slider': {
    uid: 'blog.slider',
    category: 'blog',
    schema: {
      icon: 'atom',
      name: 'slider',
      description: '',
      connection: 'default',
      collectionName: 'components_sliders',
      attributes: [
        { type: 'string', required: true, name: 'title' },
        {
          name: 'slide',
          component: 'default.slide',
          type: 'component',
          repeatable: true,
          min: 1,
          max: 5,
        },
      ],
    },
  },
  'default.dish': {
    uid: 'default.dish',
    category: 'default',
    schema: {
      icon: 'beer',
      name: 'dish',
      description: '',
      connection: 'default',
      collectionName: 'components_dishes',
      attributes: [
        {
          name: 'name',
          type: 'string',
          required: true,
          default: 'My super dish',
        },
        {
          name: 'description',
          type: 'text',
        },
        {
          name: 'price',
          type: 'float',
        },
        {
          name: 'address',
          relation: 'oneToOne',
          target: 'api::address.address',
          type: 'relation',
        },
        {
          name: 'addresses',
          relation: 'oneToMany',
          target: 'api::address.address',
          type: 'relation',
        },
        {
          name: 'picture',
          type: 'media',
          multiple: false,
          required: false,
        },
        {
          name: 'very_long_description',
          type: 'richtext',
        },
      ],
    },
  },
};

describe('retrieveComponentsThatHaveComponents', () => {
  describe('doesComponentHaveAComponentField', () => {
    it('Should return correct child component if component has a component', () => {
      expect(getComponentWithChildComponents(data['blog.slider'])).toEqual({
        component: 'blog.slider',
        childComponents: [
          {
            component: 'default.slide',
          },
        ],
      });
    });

    it('Should return no child components if component has no child components', () => {
      expect(getComponentWithChildComponents(data['default.dish'])).toEqual({
        component: 'default.dish',
        childComponents: [],
      });
    });
  });

  describe('retrievComponentsThatHaveComponents', () => {
    it('should return an array with all the components that have nested components', () => {
      expect(retrieveComponentsThatHaveComponents(data)).toEqual([
        {
          component: 'blog.slider',
          childComponents: [
            {
              component: 'default.slide',
            },
          ],
        },
      ]);
    });
  });
});
