import React from 'react';
import { shallow } from 'enzyme';

import { EmptyAttributesBlock } from 'strapi-helper-plugin';
import { GroupPage, mapDispatchToProps } from '../index';

import { deleteGroupAttribute } from '../../App/actions';

const basePath = '/plugins/content-type-builder/groups';
const props = {
  deleteGroupAttribute: jest.fn(),
  groups: [
    {
      icon: 'fa-cube',
      name: 'tests',
      description: '',
      fields: 2,
      source: 'users-permissions',
      isTemporary: false,
    },
  ],
  history: {
    push: jest.fn(),
  },
  initialDataGroup: {
    tests: {
      uid: 'tests',
      name: 'Tests',
      source: null,
      schema: {
        connection: 'default',
        collectionName: 'tests',
        description: 'tests description',
        attributes: [
          {
            name: 'name',
            type: 'string',
            required: true,
          },
          {
            name: 'quantity',
            type: 'float',
            required: true,
          },
        ],
      },
    },
  },
  location: {
    search: '',
    pathname: `${basePath}/tests`,
  },
  modifiedDataGroup: {
    tests: {
      uid: 'tests',
      name: 'Tests',
      source: null,
      schema: {
        connection: 'default',
        collectionName: 'tests',
        description: 'tests description',
        attributes: [
          {
            name: 'name',
            type: 'string',
            required: true,
          },
          {
            name: 'quantity',
            type: 'float',
            required: true,
          },
        ],
      },
    },
  },
  match: {
    params: {
      groupName: 'tests',
    },
  },
  newGroup: {
    collectionName: '',
    connection: '',
    description: '',
    name: '',
    attributes: [],
  },
};

describe('CTB <GroupPage />', () => {
  it('should not crash', () => {
    shallow(<GroupPage {...props} />);
  });

  describe('CTB <ModelPage /> render', () => {
    it("should display the EmptyAttributeBlock if the group's attributes are empty", () => {
      props.initialDataGroup.tests.schema.attributes = {};
      props.modifiedDataGroup.tests.schema.attributes = {};

      const wrapper = shallow(<GroupPage {...props} />);

      expect(wrapper.find(EmptyAttributesBlock)).toHaveLength(1);
    });
  });

  describe('GetFeatureHeaderDescription', () => {
    it("should return the model's description field", () => {
      const { getFeatureHeaderDescription } = shallow(
        <GroupPage {...props} />
      ).instance();

      expect(getFeatureHeaderDescription()).toEqual('tests description');
    });
  });

  describe('GetFeature', () => {
    it('should return the correct model', () => {
      const { getFeature } = shallow(<GroupPage {...props} />).instance();

      expect(getFeature()).toEqual(props.modifiedDataGroup.tests);
    });
    it('should return newGroup isTemporary is true', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = true;

      const { getFeature } = shallow(<GroupPage {...props} />).instance();

      expect(getFeature()).toEqual(props.newGroup);
    });
  });

  describe('GetFeatureName', () => {
    it("should return the model's name field", () => {
      const { getFeatureName } = shallow(<GroupPage {...props} />).instance();

      expect(getFeatureName()).toEqual('tests');
    });
  });

  describe('HandleGoBack', () => {
    it("should return the model's name field", () => {
      const { handleGoBack } = shallow(<GroupPage {...props} />).instance();
      handleGoBack();

      expect(props.history.push).toHaveBeenCalledWith(
        '/plugins/content-type-builder/groups'
      );
    });
  });
});

describe('CTB <GroupPage />, mapDispatchToProps', () => {
  describe('DeleteGroupAttribute', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.deleteGroupAttribute).toBeDefined();
    });
  });

  it('should call deleteGroupAttribute with modifiedDataGroup path when isTemporary is false', () => {
    props.groups.find(item => item.name == 'tests').isTemporary = false;

    const { handleDeleteGroupAttribute } = shallow(
      <GroupPage {...props} />
    ).instance();
    handleDeleteGroupAttribute('name');

    const keys = ['modifiedDataGroup', 'tests', 'schema', 'attributes', 'name'];
    expect(props.deleteGroupAttribute).toHaveBeenCalledWith(keys);
  });

  it('should call deleteGroupAttribute with modifiedDataGroup path when isTemporary is true', () => {
    props.groups.find(item => item.name == 'tests').isTemporary = true;
    const { handleDeleteGroupAttribute } = shallow(
      <GroupPage {...props} />
    ).instance();

    handleDeleteGroupAttribute('name');
    const keys = ['newGroup', 'schema', 'attributes', 'name'];
    expect(props.deleteGroupAttribute).toHaveBeenCalledWith(keys);
  });
});
