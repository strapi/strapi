import isGuidedTourCompleted from '../isGuidedTourCompleted';

describe('Guided Tour | utils | isGuidedTourComplete', () => {
  it('should return false with uncomplete state', () => {
    const state = {
      contentTypeBuilder: {
        create: false,
        success: false,
      },
      contentManager: {
        create: false,
        success: false,
      },
    };

    const result = isGuidedTourCompleted(state);

    expect(result).toBe(false);
  });

  it('should return false with partially complete state', () => {
    const state = {
      contentTypeBuilder: {
        create: true,
        success: true,
      },
      contentManager: {
        create: true,
        success: false,
      },
    };

    const result = isGuidedTourCompleted(state);

    expect(result).toBe(false);
  });

  it('should return true with complete state', () => {
    const state = {
      contentTypeBuilder: {
        create: true,
        success: true,
      },
      contentManager: {
        create: true,
        success: true,
      },
    };

    const result = isGuidedTourCompleted(state);

    expect(result).toBe(true);
  });
});
