import {
  doesComponentHaveAComponentField,
  retrieveComponentsThatHaveComponents,
} from '../retrieveComponentsThatHaveComponents';

const data = {
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
      attributes: {
        title: {
          type: 'string',
          required: true,
        },
        slide: {
          component: 'default.slide',
          type: 'component',
          repeatable: true,
          min: 1,
          max: 5,
        },
      },
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
      attributes: {
        name: {
          type: 'string',
          required: true,
          default: 'My super dish',
        },
        description: {
          type: 'text',
        },
        price: {
          type: 'float',
        },
        address: {
          nature: 'oneWay',
          target: 'application::address.address',
          dominant: false,
          unique: false,
        },
        addresses: {
          nature: 'manyWay',
          target: 'application::address.address',
          dominant: false,
          unique: false,
        },
        picture: {
          type: 'media',
          multiple: false,
          required: false,
        },
        very_long_description: {
          type: 'richtext',
        },
      },
    },
  },
};

describe('retrieveComponentsThatHaveComponents', () => {
  describe('doesComponentHaveAComponentField', () => {
    it('Should return true if one of its attributes is a component', () => {
      expect(doesComponentHaveAComponentField(data['blog.slider'])).toBe(true);
    });

    it('Should return false if none of its attributes is a component', () => {
      expect(doesComponentHaveAComponentField(data['default.dish'])).toBe(
        false
      );
    });
  });

  describe('retrievComponentsThatHaveComponents', () => {
    it('should return an array with all the components that have nested components', () => {
      expect(retrieveComponentsThatHaveComponents(data)).toEqual([
        'blog.slider',
      ]);
    });
  });
});
