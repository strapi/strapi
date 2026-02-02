export const useGetRolePermissionsQuery = jest.fn().mockReturnValue({
  data: [],
  isLoading: false,
  isError: false,
});

export const useAdminUsers = jest.fn().mockReturnValue({
  data: {
    users: [],
  },
  isLoading: false,
  isError: false,
});
