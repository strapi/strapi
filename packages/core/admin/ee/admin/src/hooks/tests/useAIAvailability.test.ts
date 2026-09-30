import { renderHook } from '@testing-library/react';

import { useAIAvailability } from '../useAIAvailability';

describe('useAIAvailability', () => {
  const originalIsEE = window.strapi.isEE;
  const originalAI = window.strapi.ai;

  beforeEach(() => {
    window.strapi.isEE = true;
  });

  afterEach(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.ai = originalAI;
  });

  it('is available when the server enables AI', () => {
    Object.assign(window.strapi, { ai: { enabled: true } });

    const { result } = renderHook(() => useAIAvailability());

    expect(result.current).toBe(true);
  });

  it('is unavailable when the license lacks the cms-ai feature', () => {
    Object.assign(window.strapi, { ai: { enabled: false } });

    const { result } = renderHook(() => useAIAvailability());

    expect(result.current).toBe(false);
  });
});
