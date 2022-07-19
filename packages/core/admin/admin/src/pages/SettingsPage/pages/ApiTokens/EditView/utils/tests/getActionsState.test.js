import getActionsState from '../getActionsState';

const data = {
  'api::category': {
    create: false,
    findOne: true,
    find: true,
    update: false,
    delete: false,
  },
  'api::country': {
    create: false,
    findOne: true,
    find: true,
    update: false,
    delete: false,
  },
  'api::homepage': {
    delete: false,
    find: true,
    update: false,
  },
};

describe('ADMIN | Pages | API TOKENS | EditView', () => {
  it('should return true when only find and findOne are true', () => {
    expect(getActionsState(data, false, ['find', 'findOne'])).toBe(true);
  });

  it('should return false if not all are true', () => {
    expect(getActionsState(data, true)).toBe(false);
  });
});
