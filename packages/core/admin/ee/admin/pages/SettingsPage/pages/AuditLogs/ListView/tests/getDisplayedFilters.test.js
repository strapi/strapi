import getDisplayedFilters from '../utils/getDisplayedFilters';

const mockUsers = {
  results: [
    {
      id: 1,
      firstname: 'test',
      lastname: 'tester',
      username: null,
      email: 'test@test.com',
    },
    {
      id: 2,
      firstname: 'test2',
      lastname: 'tester2',
      username: null,
      email: 'test2@test.com',
    },
  ],
};

describe('Audit Logs getDisplayedFilters', () => {
  it('should return all filters when canReadUsers is true', () => {
    const filters = getDisplayedFilters({
      users: mockUsers,
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
      canReadUsers: true,
    });
    const filterNames = filters.map((filter) => filter.name);
    expect(filterNames).toEqual(['action', 'date', 'user']);
  });

  it('should not return user filter when canReadUsers is false', () => {
    const filters = getDisplayedFilters({
      users: mockUsers,
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
      canReadUsers: false,
    });
    const filterNames = filters.map((filter) => filter.name);
    expect(filterNames).toEqual(['action', 'date']);
  });
});
