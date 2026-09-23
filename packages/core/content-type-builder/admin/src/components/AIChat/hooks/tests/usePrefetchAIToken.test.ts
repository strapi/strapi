import { renderHook } from '@testing-library/react';

import { prefetchAIToken } from '../../lib/aiClient';
import { usePrefetchAIToken } from '../usePrefetchAIToken';

const mockUseAIAvailability = jest.fn();

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  useAIAvailability: () => mockUseAIAvailability(),
}));

jest.mock('../../lib/aiClient', () => ({
  prefetchAIToken: jest.fn(),
}));

describe('usePrefetchAIToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not request an AI token when AI is not available', () => {
    mockUseAIAvailability.mockReturnValue(false);

    renderHook(() => usePrefetchAIToken());

    expect(prefetchAIToken).not.toHaveBeenCalled();
  });

  it('requests an AI token when AI is available', () => {
    mockUseAIAvailability.mockReturnValue(true);

    renderHook(() => usePrefetchAIToken());

    expect(prefetchAIToken).toHaveBeenCalledTimes(1);
  });
});
