import cleanPermissions from '../cleanPermissions';

const data = {
  application: {
    controllers: {
      address: {
        find: { enabled: false, policy: '' },
        findOne: { enabled: false, policy: '' },
        count: { enabled: false, policy: '' },
        create: { enabled: false, policy: '' },
        update: { enabled: false, policy: '' },
        delete: { enabled: false, policy: '' },
        test: { enabled: false, policy: '' },
      },
      test: {},
      category: {
        find: { enabled: false, policy: '' },
        findOne: { enabled: false, policy: '' },
        count: { enabled: false, policy: '' },
        create: { enabled: false, policy: '' },
        update: { enabled: false, policy: '' },
        delete: { enabled: false, policy: '' },
      },
      country: {
        find: { enabled: false, policy: '' },
        findOne: { enabled: false, policy: '' },
        count: { enabled: false, policy: '' },
        create: { enabled: false, policy: '' },
        update: { enabled: false, policy: '' },
        delete: { enabled: false, policy: '' },
      },
    },
  },
  manager: {
    controllers: {},
  },
  graphql: {
    controllers: {
      graphql: {},
    },
  },
};

describe('USERS PERMISSIONS | utils | cleanPermissions', () => {
  it('should return an empty object', () => {
    expect(cleanPermissions({})).toEqual({});
  });

  it('should return only the plugins that have methods inside their controller', () => {
    const expected = {
      application: {
        controllers: {
          address: {
            find: { enabled: false, policy: '' },
            findOne: { enabled: false, policy: '' },
            count: { enabled: false, policy: '' },
            create: { enabled: false, policy: '' },
            update: { enabled: false, policy: '' },
            delete: { enabled: false, policy: '' },
            test: { enabled: false, policy: '' },
          },
          category: {
            find: { enabled: false, policy: '' },
            findOne: { enabled: false, policy: '' },
            count: { enabled: false, policy: '' },
            create: { enabled: false, policy: '' },
            update: { enabled: false, policy: '' },
            delete: { enabled: false, policy: '' },
          },
          country: {
            find: { enabled: false, policy: '' },
            findOne: { enabled: false, policy: '' },
            count: { enabled: false, policy: '' },
            create: { enabled: false, policy: '' },
            update: { enabled: false, policy: '' },
            delete: { enabled: false, policy: '' },
          },
        },
      },
    };

    expect(cleanPermissions(data)).toEqual(expected);
  });
});
