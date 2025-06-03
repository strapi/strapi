export const useRBAC = jest.fn(() => ({
  isLoading: false,
  allowedActions: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
}));
