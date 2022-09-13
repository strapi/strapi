import arePreviousSectionsDone from '../arePreviousSectionsDone';

describe('Guided Tour | utils | arePreviousSectionsDone', () => {
  it('should return true if no sections before', () => {
    const sectionName = 'contentTypeBuilder';
    const state = {
      contentTypeBuilder: { create: false, success: false },
      contentManager: { create: false, success: false },
      apiTokens: { create: false, success: false },
    };
    const result = arePreviousSectionsDone(sectionName, state);

    expect(result).toEqual(true);
  });

  it('should return true if sections before are done', () => {
    const sectionName = 'contentManager';
    const state = {
      contentTypeBuilder: { create: true, success: true },
      contentManager: { create: false, success: false },
      apiTokens: { create: false, success: false },
    };
    const result = arePreviousSectionsDone(sectionName, state);

    expect(result).toEqual(true);
  });

  it('should return false if sections before are not entirely done', () => {
    const sectionName = 'contentManager';
    const state = {
      contentTypeBuilder: { create: true, success: false },
      contentManager: { create: false, success: false },
      apiTokens: { create: false, success: false },
    };
    const result = arePreviousSectionsDone(sectionName, state);

    expect(result).toEqual(false);
  });

  it('should return false if sections before are not done at all', () => {
    const sectionName = 'contentManager';
    const state = {
      contentTypeBuilder: { create: true, success: false },
      contentManager: { create: false, success: false },
      apiTokens: { create: false, success: false },
    };
    const result = arePreviousSectionsDone(sectionName, state);

    expect(result).toEqual(false);
  });
});
