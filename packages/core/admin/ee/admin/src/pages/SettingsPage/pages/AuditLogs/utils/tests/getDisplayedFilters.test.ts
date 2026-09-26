import { getDisplayedFilters } from '../getDisplayedFilters';

const mockUsers = [
  {
    id: 1,
    email: 'test@test.com',
    displayName: 'test tester',
  },
  {
    id: 2,
    email: 'test2@test.com',
    displayName: 'test2 tester2',
  },
];

describe('Audit Logs getDisplayedFilters', () => {
  it('should return the action, date and user filters', () => {
    const filters = getDisplayedFilters({
      users: mockUsers,
      // @ts-expect-error - mock
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
    });
    const filterNames = filters.map((filter) => filter.name);
    expect(filterNames).toEqual(['action', 'date', 'user']);
  });

  it('offers the new admin-user actions and hides the legacy user.* keys', () => {
    const filters = getDisplayedFilters({
      users: mockUsers,
      // @ts-expect-error - mock
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
    });
    const values = filters
      .find((filter) => filter.name === 'action')
      ?.options?.map((option) => (typeof option === 'string' ? option : option.value));

    expect(values).toEqual(
      expect.arrayContaining(['admin-user.create', 'admin-user.update', 'admin-user.delete'])
    );
    expect(values).not.toEqual(
      expect.arrayContaining(['user.create', 'user.update', 'user.delete'])
    );
    // One "Create user" option, not two
    expect(
      values?.filter((value) => value === 'user.create' || value === 'admin-user.create')
    ).toEqual(['admin-user.create']);
  });

  it('should map the users to combobox options using their display name', () => {
    const filters = getDisplayedFilters({
      users: mockUsers,
      // @ts-expect-error - mock
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
    });

    const userFilter = filters.find((filter) => filter.name === 'user');
    expect(userFilter?.options).toEqual([
      { label: 'test tester', value: '1' },
      { label: 'test2 tester2', value: '2' },
    ]);
  });

  it('should forward the pagination props to the user filter', () => {
    const onLoadMore = jest.fn();
    const filters = getDisplayedFilters({
      users: mockUsers,
      // @ts-expect-error - mock
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
      usersFilter: { loading: true, hasMoreItems: true, onLoadMore },
    });

    const userFilter = filters.find((filter) => filter.name === 'user');
    expect(userFilter).toMatchObject({ loading: true, hasMoreItems: true, onLoadMore });
  });
});
