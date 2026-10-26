import { renderHook } from '@testing-library/react';

import { useFetchGenerateTitle } from '../useAIFetch';

const mockUseAIAvailability = jest.fn();
const mockUseGetAiUsageQuery = jest.fn((_arg: unknown, _options: unknown) => ({
  refetch: jest.fn(),
}));

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  useAIAvailability: () => mockUseAIAvailability(),
  useGetAiUsageQuery: (arg: unknown, options: unknown) => mockUseGetAiUsageQuery(arg, options),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  useAppInfo: () => undefined,
}));

describe('useAIFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips the AI usage query when AI is not available', () => {
    mockUseAIAvailability.mockReturnValue(false);

    renderHook(() => useFetchGenerateTitle());

    expect(mockUseGetAiUsageQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ skip: true })
    );
  });

  it('runs the AI usage query when AI is available', () => {
    mockUseAIAvailability.mockReturnValue(true);

    renderHook(() => useFetchGenerateTitle());

    expect(mockUseGetAiUsageQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ skip: false })
    );
  });
});
