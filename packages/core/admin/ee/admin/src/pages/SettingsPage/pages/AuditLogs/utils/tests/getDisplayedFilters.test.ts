import { getDisplayedFilters } from '../getDisplayedFilters';

const mockUsers = [
  {
    id: 1,
    firstname: 'test',
    lastname: 'tester',
    email: 'test@test.com',
    isActive: true,
    blocked: false,
    createdAt: '',
    updatedAt: '',
    roles: [],
  },
  {
    id: 2,
    firstname: 'test2',
    lastname: 'tester2',
    email: 'test2@test.com',
    isActive: true,
    blocked: false,
    createdAt: '',
    updatedAt: '',
    roles: [],
  },
];

describe('Audit Logs getDisplayedFilters', () => {
  it('should return all filters when canReadUsers is true', () => {
    const filters = getDisplayedFilters({
      users: mockUsers,
      // @ts-expect-error - mock
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
      canReadUsers: true,
    });
    const filterNames = filters.map((filter) => filter.name);
    expect(filterNames).toEqual(['action', 'date', 'user']);
  });

  it('should not return user filter when canReadUsers is false', () => {
    const filters = getDisplayedFilters({
      users: mockUsers,
      // @ts-expect-error - mock
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
      canReadUsers: false,
    });
    const filterNames = filters.map((filter) => filter.name);
    expect(filterNames).toEqual(['action', 'date']);
  });
});
