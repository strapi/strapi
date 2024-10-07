const useModalQueryParams = jest.fn().mockReturnValue([
  {
    queryObject: {
      page: 1,
      sort: 'updatedAt:DESC',
      pageSize: 10,
      filters: {
        $and: [],
      },
    },
  },
  {
    onChangeFilters: jest.fn(),
    onChangePage: jest.fn(),
    onChangePageSize: jest.fn(),
    onChangeSort: jest.fn(),
    onChangeSearch: jest.fn(),
    onChangeFolder: jest.fn(),
  },
]);

export default useModalQueryParams;
