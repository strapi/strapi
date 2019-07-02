import React from 'react';
import { shallow } from 'enzyme';

import GroupPage from '../index';

const basePath = '/plugins/content-type-builder/groups';
const props = {
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

  describe('GetFeatureHeaderDescription', () => {
    it("should return the model's description field", () => {
      const { getFeatureHeaderDescription } = shallow(
        <GroupPage {...props} />
      ).instance();

      expect(getFeatureHeaderDescription()).toEqual('tests description');
    });
  });

  describe('getFeatureName', () => {
    it("should return the model's name field", () => {
      const { getFeatureName } = shallow(<GroupPage {...props} />).instance();

      expect(getFeatureName()).toEqual('tests');
    });
  });
});
